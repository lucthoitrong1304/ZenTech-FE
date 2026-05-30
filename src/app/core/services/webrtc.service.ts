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
  
  public localScreenStream = signal<MediaStream | null>(null);
  public remoteScreenStream = signal<MediaStream | null>(null);

  private senders: Map<string, RTCRtpSender> = new Map();
  private onNegotiationCallback: ((offer: RTCSessionDescriptionInit) => void) | null = null;

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
    onTrack: (stream: MediaStream) => void,
    onNegotiationNeeded?: (offer: RTCSessionDescriptionInit) => void
  ): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(this.iceServers);
    this.onNegotiationCallback = onNegotiationNeeded || null;

    // Add local stream tracks to peer connection
    const currentLocalStream = this.localStream();
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach(track => {
        const sender = this.peerConnection?.addTrack(track, currentLocalStream);
        if (sender) this.senders.set(track.id, sender);
      });
    }

    // Listen for remote tracks
    this.peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      const currentRemote = this.remoteStream();
      
      // If we don't have a remote stream yet, it's the main camera/audio stream
      if (!currentRemote || currentRemote.id === stream.id) {
        if (!currentRemote) this.remoteStream.set(stream);
      } else {
        // Different stream id -> screen share stream
        this.remoteScreenStream.set(stream);
        
        stream.onremovetrack = () => {
          if (stream.getTracks().length === 0) {
            this.remoteScreenStream.set(null);
          }
        };
      }
      onTrack(stream);
    };

    // Listen for ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    return this.peerConnection;
  }

  async startScreenShare(): Promise<void> {
    if (!this.peerConnection) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      this.localScreenStream.set(screenStream);
      
      screenStream.getTracks().forEach(track => {
        const sender = this.peerConnection?.addTrack(track, screenStream);
        if (sender) this.senders.set(track.id, sender);
        
        // Stop sharing when native browser UI 'Stop sharing' is clicked
        track.onended = () => {
          this.stopScreenShare();
        };
      });
      
      // Manually trigger renegotiation for new tracks
      if (this.onNegotiationCallback) {
        const offer = await this.createOffer();
        this.onNegotiationCallback(offer);
      }
    } catch (err) {
      console.error('Error starting screen share', err);
    }
  }

  async stopScreenShare(): Promise<void> {
    const screenStream = this.localScreenStream();
    if (screenStream) {
      let needsRenegotiation = false;
      screenStream.getTracks().forEach(track => {
        track.stop();
        const sender = this.senders.get(track.id);
        if (sender && this.peerConnection) {
          this.peerConnection.removeTrack(sender);
          needsRenegotiation = true;
        }
        this.senders.delete(track.id);
      });
      this.localScreenStream.set(null);
      
      if (needsRenegotiation && this.onNegotiationCallback) {
        const offer = await this.createOffer();
        this.onNegotiationCallback(offer);
      }
    }
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
    if (!this.peerConnection?.remoteDescription) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  closeConnection() {
    this.stopScreenShare();
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.pendingIceCandidates.length = 0;
    this.senders.clear();
    this.onNegotiationCallback = null;
    
    // Stop all local tracks
    const stream = this.localStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.localStream.set(null);
    this.remoteStream.set(null);
    this.remoteScreenStream.set(null);
  }
}
