import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CallSignalingService } from '../../../core/services/call-signaling.service';
import { LucidePhone, LucidePhoneOff } from '@lucide/angular';

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, LucidePhone, LucidePhoneOff],
  template: `
    <p-dialog
      [visible]="isVisible()"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [showHeader]="false"
      styleClass="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white"
    >
      <div class="flex flex-col items-center justify-center p-8 bg-white" *ngIf="incomingCall()">
        <div class="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6 animate-pulse">
          <svg lucidePhone class="text-indigo-600 w-10 h-10"></svg>
        </div>
        
        <h2 class="text-xl font-bold text-gray-900 mb-2">Cuộc gọi đến</h2>
        <p class="text-gray-600 font-medium mb-8">{{ incomingCall()?.senderEmail }}</p>

        <div class="flex items-center justify-center gap-6 w-full">
          <button
            class="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors shadow-lg"
            (click)="rejectCall()"
          >
            <svg lucidePhoneOff class="w-6 h-6"></svg>
          </button>
          
          <button
            class="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg animate-bounce"
            (click)="acceptCall()"
          >
            <svg lucidePhone class="w-6 h-6"></svg>
          </button>
        </div>
      </div>
    </p-dialog>
  `
})
export class IncomingCallDialogComponent {
  callSignaling = inject(CallSignalingService);


  get incomingCall() {
    return this.callSignaling.incomingCall;
  }

  isVisible(): boolean {
    return this.incomingCall() !== null;
  }

  acceptCall() {
    const call = this.incomingCall();
    if (call) {
      this.callSignaling.acceptCall(call.senderEmail);
    }
  }

  rejectCall() {
    const call = this.incomingCall();
    if (call) {
      this.callSignaling.rejectCall(call.senderEmail);
    }
  }
}
