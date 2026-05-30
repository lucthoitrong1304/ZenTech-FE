import { Component, ElementRef, ViewChild, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CallSignalingService } from '../../../core/services/call-signaling.service';
import { WebRTCService } from '../../../core/services/webrtc.service';
import { LucidePhoneOff, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff, LucideMonitorUp, LucideMonitorOff } from '@lucide/angular';

@Component({
  selector: 'app-in-call-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, LucidePhoneOff, LucideMic, LucideMicOff, LucideVideo, LucideVideoOff, LucideMonitorUp, LucideMonitorOff],
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
        <div class="flex-1 relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          
          <!-- Screen Share Video (Remote or Local) -->
          <video 
            #screenVideo 
            autoplay 
            playsinline 
            class="w-full h-full object-contain absolute inset-0 z-0 transition-opacity duration-300"
            [class.opacity-0]="!hasScreenStream()"
          ></video>

          <!-- Remote Camera Video -->
          <div 
            class="transition-all duration-500 ease-in-out z-10"
            [ngClass]="hasScreenStream() ? 'absolute top-6 right-6 w-32 md:w-64 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700' : 'absolute inset-0 w-full h-full'"
            [class.hidden]="!hasRemoteStream() && hasScreenStream()"
          >
            <video 
              #remoteVideo 
              autoplay 
              playsinline 
              class="w-full h-full transition-all duration-500 ease-in-out"
              [ngClass]="hasScreenStream() ? 'object-cover' : 'object-contain'"
            ></video>
            
            <!-- Remote Label -->
            <div *ngIf="hasRemoteStream()" 
                 class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-2 pointer-events-none"
                 [ngClass]="!hasScreenStream() ? 'px-6 py-4 pt-16' : 'px-2 py-1.5 pt-8'">
              <div class="rounded-full bg-green-500 animate-pulse shrink-0 shadow-lg"
                   [ngClass]="!hasScreenStream() ? 'w-3 h-3' : 'w-1.5 h-1.5'"></div>
              <span class="truncate font-medium text-white shadow-sm"
                    [ngClass]="!hasScreenStream() ? 'max-w-md text-lg' : 'max-w-[100px] md:max-w-[200px] text-xs'">
                {{ activeCall()?.targetEmail }}
              </span>
            </div>
          </div>
          
          <!-- Waiting UI -->
          <div *ngIf="!hasRemoteStream() && !hasScreenStream()" class="absolute inset-0 flex flex-col items-center justify-center z-0">
            <div class="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4 animate-pulse border-4 border-gray-700 shadow-2xl">
              <span class="text-4xl text-gray-400 font-bold">{{ activeCall()?.targetEmail?.charAt(0)?.toUpperCase() }}</span>
            </div>
            <p class="text-xl font-semibold text-gray-200 tracking-wide">
              {{ activeCall()?.isCaller ? 'Đang gọi...' : 'Đang kết nối...' }}
            </p>
            <p class="text-sm text-gray-500 mt-2 bg-gray-900 px-3 py-1 rounded-full">{{ activeCall()?.targetEmail }}</p>
          </div>

          <!-- Local Camera Video (PiP) -->
          <div 
            class="absolute right-6 transition-all duration-500 ease-in-out bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-20"
            [ngClass]="hasScreenStream() ? (hasRemoteStream() ? 'top-28 md:top-48 w-32 md:w-64 aspect-video' : 'top-6 w-32 md:w-64 aspect-video') : 'bottom-32 w-32 md:w-64 aspect-video'"
          >
            <video 
              #localVideo 
              autoplay 
              playsinline 
              muted 
              class="w-full h-full object-cover transform -scale-x-100"
            ></video>
            <!-- Local Label -->
            <div class="absolute bottom-0 left-0 w-full px-2 py-1.5 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center pointer-events-none">
              <span class="text-xs font-medium text-white shadow-sm">Bạn</span>
            </div>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-4 md:gap-6 z-20">
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
          
          <!-- Toggle Screen Share -->
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
            [class.bg-gray-700]="!isScreenSharing()"
            [class.hover:bg-gray-600]="!isScreenSharing()"
            [class.bg-white]="isScreenSharing()"
            [class.text-black]="isScreenSharing()"
            (click)="toggleScreenShare()"
          >
            <svg lucideMonitorOff *ngIf="isScreenSharing()" class="w-6 h-6"></svg>
            <svg lucideMonitorUp *ngIf="!isScreenSharing()" class="w-6 h-6"></svg>
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
  @ViewChild('screenVideo') screenVideoRef!: ElementRef<HTMLVideoElement>;

  isAudioMuted = false;
  isVideoMuted = false;
  
  hasRemoteStream = computed(() => this.webrtcService.remoteStream() !== null);
  isScreenSharing = computed(() => this.webrtcService.localScreenStream() !== null);
  hasScreenStream = computed(() => this.webrtcService.remoteScreenStream() !== null || this.webrtcService.localScreenStream() !== null);

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
    
    // Effect to bind screen stream to video element
    effect(() => {
      const remoteScreen = this.webrtcService.remoteScreenStream();
      const localScreen = this.webrtcService.localScreenStream();
      const stream = remoteScreen || localScreen;
      
      if (stream && this.screenVideoRef?.nativeElement) {
        this.screenVideoRef.nativeElement.srcObject = stream;
      } else if (!stream && this.screenVideoRef?.nativeElement) {
         this.screenVideoRef.nativeElement.srcObject = null;
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
  
  async toggleScreenShare() {
    if (this.isScreenSharing()) {
      await this.webrtcService.stopScreenShare();
    } else {
      await this.webrtcService.startScreenShare();
    }
  }

  private resetState() {
    this.isAudioMuted = false;
    this.isVideoMuted = false;
  }
}
