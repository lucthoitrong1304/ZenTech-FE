import { Injectable, signal } from '@angular/core';

export interface CallPeer {
  id: string; // The email of the person we are calling or who is calling us
}

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private readonly pendingIceCandidates: RTCIceCandidateInit[] = [];
  public localStream = signal<MediaStream | null>(null);
  public remoteStream = signal<MediaStream | null>(null);

  private readonly iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {}

  async initializeLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      this.localStream.set(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  }

  createPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
  ): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    // Add local stream tracks to peer connection
    const currentLocalStream = this.localStream();
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, currentLocalStream);
      });
    }

    // Listen for remote tracks
    this.peerConnection.ontrack = (event) => {
      this.remoteStream.set(event.streams[0]);
      onTrack(event.streams[0]);
    };

    // Listen for ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushPendingIceCandidates();
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    await this.flushPendingIceCandidates();
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection?.remoteDescription) {
      return;
    }

    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.pendingIceCandidates.length = 0;
    
    // Stop all local tracks
    const stream = this.localStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.localStream.set(null);
    this.remoteStream.set(null);
  }
}
