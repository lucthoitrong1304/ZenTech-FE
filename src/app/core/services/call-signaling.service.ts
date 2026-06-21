import { Injectable, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';
import { WebRTCService } from './webrtc.service';
import { buildWebSocketUrl } from './websocket-url';

export interface WebRtcSignalMessage {
  type: 'CALL_REQUEST' | 'CALL_ACCEPTED' | 'CALL_REJECTED' | 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'HANG_UP' | 'BUSY' | 'PARTNER_LEFT';
  senderEmail: string;
  targetEmail: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root'
})
export class CallSignalingService {
  private stompClient: Client | null = null;
  private currentUserEmail: string | null = null;
  private pendingCallTargetEmail: string | null = null;
  private authStorageService = inject(AuthStorageService);
  private webrtcService = inject(WebRTCService);
  private peerConnectionInitialized = false;

  // Global Call State Signals
  public incomingCall = signal<{ senderEmail: string } | null>(null);
  public activeCall = signal<{ targetEmail: string; isCaller: boolean } | null>(null);
  private callStartTime: number | null = null;
  public callEnded = new Subject<{ durationStr: string; status: 'ENDED' | 'MISSED' | 'BUSY'; targetEmail: string; isCaller: boolean }>();

  constructor() {}

  public initStompClient(token: string, currentUserEmail: string) {
    if (
      this.stompClient &&
      this.currentUserEmail === currentUserEmail &&
      (this.stompClient.connected || this.stompClient.active)
    ) {
      return;
    }

    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }

    this.currentUserEmail = currentUserEmail;
    this.stompClient = new Client({
      brokerURL: buildWebSocketUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (msg: string) => console.log('[STOMP]', msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      console.log('Connected to STOMP WebRTC Signaling');
      this.stompClient?.subscribe('/user/queue/webrtc', (message: IMessage) => {
        this.handleIncomingSignal(JSON.parse(message.body) as WebRtcSignalMessage);
      });

      if (this.pendingCallTargetEmail) {
        const targetEmail = this.pendingCallTargetEmail;
        this.pendingCallTargetEmail = null;
        this.publishCallRequest(targetEmail);
      }
    };

    this.stompClient.activate();
  }

  private async handleIncomingSignal(message: WebRtcSignalMessage) {
    switch (message.type) {
      case 'PARTNER_LEFT':
        this.peerConnectionInitialized = false;
        this.webrtcService.resetPeerConnection();
        break;

      case 'CALL_REQUEST':
        if (this.activeCall()?.targetEmail === message.senderEmail) {
          // Auto-accept if we are already waiting for this partner
          this.sendSignal({
            type: 'CALL_ACCEPTED',
            senderEmail: '',
            targetEmail: message.senderEmail
          });
        } else {
          // Show incoming call dialog
          this.incomingCall.set({ senderEmail: message.senderEmail });
        }
        break;

      case 'CALL_ACCEPTED':
        // The other person accepted the call. We can now create an offer and send it.
        this.activeCall.set({ targetEmail: message.senderEmail, isCaller: true });
        this.callStartTime = Date.now();
        
        // Ensure local stream is ready before creating peer connection
        if (!this.webrtcService.localStream()) {
          await this.webrtcService.initializeLocalStream(true, true);
        }

        if (!this.peerConnectionInitialized) {
          this.webrtcService.createPeerConnection(
            (candidate) => this.sendIceCandidate(message.senderEmail, candidate),
            (stream) => console.log('Remote stream received', stream),
            (offer) => {
              this.sendSignal({
                type: 'OFFER',
                senderEmail: '',
                targetEmail: message.senderEmail,
                sdp: JSON.stringify(offer)
              });
            },
            () => this.handleIncomingSignal({ type: 'PARTNER_LEFT', senderEmail: message.senderEmail, targetEmail: '' })
          );
          this.peerConnectionInitialized = true;
        }

        const offer = await this.webrtcService.createOffer();
        this.sendSignal({
          type: 'OFFER',
          senderEmail: '', // Backend fills this
          targetEmail: message.senderEmail,
          sdp: JSON.stringify(offer)
        });
        break;

      case 'CALL_REJECTED':
        this.endCall('MISSED');
        break;
      case 'BUSY':
        this.endCall('BUSY');
        break;
      case 'HANG_UP':
        this.endCall('ENDED');
        break;

      case 'OFFER':
        // We received an offer (we are the callee who accepted) or it's a renegotiation offer
        if (!this.peerConnectionInitialized) {
          this.webrtcService.createPeerConnection(
            (candidate) => this.sendIceCandidate(message.senderEmail, candidate),
            (stream) => console.log('Remote stream received', stream),
            (offer) => {
              this.sendSignal({
                type: 'OFFER',
                senderEmail: '',
                targetEmail: message.senderEmail,
                sdp: JSON.stringify(offer)
              });
            },
            () => this.handleIncomingSignal({ type: 'PARTNER_LEFT', senderEmail: message.senderEmail, targetEmail: '' })
          );
          this.peerConnectionInitialized = true;
        }
        
        const answer = await this.webrtcService.createAnswer(JSON.parse(message.sdp!));
        this.sendSignal({
          type: 'ANSWER',
          senderEmail: '',
          targetEmail: message.senderEmail,
          sdp: JSON.stringify(answer)
        });
        break;

      case 'ANSWER':
        await this.webrtcService.handleAnswer(JSON.parse(message.sdp!));
        break;

      case 'ICE_CANDIDATE':
        if (message.candidate) {
          await this.webrtcService.handleIceCandidate(message.candidate);
        }
        break;
    }
  }

  private sendSignal(message: WebRtcSignalMessage): boolean {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/webrtc.signal',
        body: JSON.stringify(message)
      });
      return true;
    }

    console.warn('[WebRTC] STOMP client is not connected. Signal was not sent.', message.type);
    return false;
  }

  // --- Actions triggered by UI ---

  public initiateCall(targetEmail: string) {
    const normalizedTargetEmail = targetEmail.trim();

    if (!normalizedTargetEmail) {
      return;
    }

    if (!this.stompClient?.connected) {
      this.ensureStompClient();
    }

    if (!this.stompClient?.connected) {
      this.pendingCallTargetEmail = normalizedTargetEmail;
      console.warn('[WebRTC] STOMP is connecting. Call request queued.', normalizedTargetEmail);
      return;
    }

    this.publishCallRequest(normalizedTargetEmail);
  }

  private publishCallRequest(targetEmail: string): void {
    const sent = this.sendSignal({
      type: 'CALL_REQUEST',
      senderEmail: '',
      targetEmail
    });

    if (sent) {
      this.activeCall.set({ targetEmail, isCaller: true });
    }
  }

  private ensureStompClient(): void {
    const token = this.authStorageService.getAccessToken();
    const session = this.authStorageService.getSession();

    if (!token || !session) {
      console.warn('[WebRTC] Cannot initialize STOMP without an authenticated session.');
      return;
    }

    this.initStompClient(token, session.email);
  }

  public async acceptCall(targetEmail: string) {
    this.incomingCall.set(null);
    this.activeCall.set({ targetEmail, isCaller: false });
    this.callStartTime = Date.now();
    
    await this.webrtcService.initializeLocalStream(true, true);
    
    this.sendSignal({
      type: 'CALL_ACCEPTED',
      senderEmail: '',
      targetEmail: targetEmail
    });
  }

  public rejectCall(targetEmail: string) {
    this.sendSignal({
      type: 'CALL_REJECTED',
      senderEmail: '',
      targetEmail: targetEmail
    });
    this.endCall('MISSED');
  }

  public hangUpCall() {
    const call = this.activeCall();
    if (call) {
      this.sendSignal({
        type: 'HANG_UP',
        senderEmail: '',
        targetEmail: call.targetEmail
      });
    }
    this.endCall('ENDED');
  }

  private endCall(status: 'ENDED' | 'MISSED' | 'BUSY' = 'ENDED') {
    const call = this.activeCall();
    const incoming = this.incomingCall();
    const targetEmail = call?.targetEmail || incoming?.senderEmail;
    const isCaller = call?.isCaller ?? true;
    
    if (targetEmail) {
      let durationStr = '00:00';
      if (this.callStartTime && status === 'ENDED') {
        const diffInSeconds = Math.floor((Date.now() - this.callStartTime) / 1000);
        const mins = Math.floor(diffInSeconds / 60);
        const secs = diffInSeconds % 60;
        durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      
      this.callEnded.next({ durationStr, status, targetEmail, isCaller });
    }

    this.incomingCall.set(null);
    this.activeCall.set(null);
    this.callStartTime = null;
    this.peerConnectionInitialized = false;
    this.webrtcService.closeConnection();
  }

  private sendIceCandidate(targetEmail: string, candidate: RTCIceCandidate) {
    this.sendSignal({
      type: 'ICE_CANDIDATE',
      senderEmail: '',
      targetEmail: targetEmail,
      candidate: candidate.toJSON()
    });
  }
}
