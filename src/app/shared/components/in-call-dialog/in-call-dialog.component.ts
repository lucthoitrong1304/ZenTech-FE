import { Component, ElementRef, ViewChild, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CallSignalingService } from '../../../core/services/call-signaling.service';
import { WebRTCService } from '../../../core/services/webrtc.service';
import { LucidePhoneOff, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff } from '@lucide/angular';

@Component({
  selector: 'app-in-call-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, LucidePhoneOff, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff],
  template: `
    <p-dialog
      [visible]="isVisible()"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [showHeader]="false"
      [style]="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: '0' }"
      [contentStyle]="{ padding: '0', height: '100%' }"
      styleClass="bg-gray-900 border-none overflow-hidden"
    >
      <div class="flex flex-col h-screen w-full bg-gray-900 text-white relative">
        <!-- Main Video Area -->
        <div class="flex-1 relative w-full h-full flex items-center justify-center bg-black">
          <!-- Remote Video -->
          <video 
            #remoteVideo 
            autoplay 
            playsinline 
            class="w-full h-full object-contain"
            [class.hidden]="!hasRemoteStream()"
          ></video>
          
          <div *ngIf="!hasRemoteStream()" class="absolute inset-0 flex flex-col items-center justify-center">
            <div class="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4 animate-pulse">
              <span class="text-3xl text-gray-400">{{ activeCall()?.targetEmail?.charAt(0)?.toUpperCase() }}</span>
            </div>
            <p class="text-xl font-medium text-gray-300">
              {{ activeCall()?.isCaller ? 'Đang gọi...' : 'Đang kết nối...' }}
            </p>
            <p class="text-sm text-gray-500 mt-2">{{ activeCall()?.targetEmail }}</p>
          </div>

          <!-- Local Video (PiP) -->
          <div class="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-72 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
            <video 
              #localVideo 
              autoplay 
              playsinline 
              muted 
              class="w-full h-full object-cover transform -scale-x-100"
            ></video>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-6 z-20">
          <!-- Mute Mic -->
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            [class.bg-gray-700]="!isAudioMuted"
            [class.hover:bg-gray-600]="!isAudioMuted"
            [class.bg-white]="isAudioMuted"
            [class.text-black]="isAudioMuted"
            (click)="toggleAudio()"
          >
            <svg lucideMicOff *ngIf="isAudioMuted" class="w-6 h-6"></svg>
            <svg lucideMic *ngIf="!isAudioMuted" class="w-6 h-6"></svg>
          </button>

          <!-- Hang up -->
          <button
            class="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            (click)="hangUp()"
          >
            <svg lucidePhoneOff class="w-7 h-7"></svg>
          </button>

          <!-- Toggle Video -->
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            [class.bg-gray-700]="!isVideoMuted"
            [class.hover:bg-gray-600]="!isVideoMuted"
            [class.bg-white]="isVideoMuted"
            [class.text-black]="isVideoMuted"
            (click)="toggleVideo()"
          >
            <svg lucideVideoOff *ngIf="isVideoMuted" class="w-6 h-6"></svg>
            <svg lucideVideo *ngIf="!isVideoMuted" class="w-6 h-6"></svg>
          </button>
        </div>
      </div>
    </p-dialog>
  `
})
export class InCallDialogComponent {
  callSignaling = inject(CallSignalingService);
  webrtcService = inject(WebRTCService);

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;



  isAudioMuted = false;
  isVideoMuted = false;
  hasRemoteStream = computed(() => this.webrtcService.remoteStream() !== null);

  constructor() {
    // Effect to bind local stream to video element
    effect(() => {
      const stream = this.webrtcService.localStream();
      if (stream && this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = stream;
      }
    });

    // Effect to bind remote stream to video element
    effect(() => {
      const stream = this.webrtcService.remoteStream();
      if (stream && this.remoteVideoRef?.nativeElement) {
        this.remoteVideoRef.nativeElement.srcObject = stream;
      }
    });
  }

  get activeCall() {
    return this.callSignaling.activeCall;
  }

  isVisible(): boolean {
    return this.activeCall() !== null;
  }

  hangUp() {
    this.callSignaling.hangUpCall();
    this.resetState();
  }

  toggleAudio() {
    const stream = this.webrtcService.localStream();
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        this.isAudioMuted = !track.enabled;
      });
    }
  }

  toggleVideo() {
    const stream = this.webrtcService.localStream();
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        this.isVideoMuted = !track.enabled;
      });
    }
  }

  private resetState() {
    this.isAudioMuted = false;
    this.isVideoMuted = false;
  }
}
