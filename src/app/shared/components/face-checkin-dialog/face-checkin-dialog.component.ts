import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaceRecognitionService, FaceValidationStatus } from '../../../core/services/face-recognition.service';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface FaceCheckinData {
  descriptor: Float32Array;
}

@Component({
  selector: 'app-face-checkin-dialog',
  standalone: true,
  imports: [DialogModule, CommonModule, ButtonModule],
  templateUrl: './face-checkin-dialog.component.html',
  styleUrls: ['./face-checkin-dialog.component.scss']
})
export class FaceCheckinDialogComponent implements OnInit, OnDestroy {
  visible = input.required<boolean>();
  onClose = output<void>();
  onSuccess = output<FaceCheckinData>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private faceService = inject(FaceRecognitionService);

  status = signal<FaceValidationStatus>('INITIALIZING');
  isProcessing = signal<boolean>(false);

  // Validation feedback text
  feedbackText = computed(() => {
    if (!this.faceService.isReady()) return 'Đang tải AI Model...';
    
    switch (this.status()) {
      case 'INITIALIZING': return 'Đang khởi tạo Camera...';
      case 'NO_FACE': return 'Không tìm thấy khuôn mặt';
      case 'MULTIPLE_FACES': return 'Chỉ được có một khuôn mặt';
      case 'TOO_CLOSE': return 'Đưa mặt ra xa hơn';
      case 'TOO_FAR': return 'Đưa mặt lại gần hơn';
      case 'NOT_CENTERED': return 'Giữ mặt trong khung';
      case 'VALID': return 'Đang xử lý...';
      default: return '';
    }
  });

  private detectInterval: any;
  private validDuration = 0; // ms
  private readonly CAPTURE_DELAY = 1000; // 1.0s cho check-in (nhanh hơn đăng ký)
  private readonly INTERVAL_TIME = 200; // ms

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.resetState();
        this.startProcess();
      } else {
        this.stopProcess();
      }
    });
  }

  ngOnInit() {
    this.faceService.loadModels();
  }

  ngOnDestroy() {
    this.stopProcess();
  }

  private resetState() {
    this.status.set('INITIALIZING');
    this.validDuration = 0;
    this.isProcessing.set(false);
  }

  private async startProcess() {
    if (!this.faceService.isReady()) {
      await this.faceService.loadModels();
    }

    setTimeout(async () => {
      if (this.videoElement && this.videoElement.nativeElement) {
        await this.faceService.startCamera(this.videoElement.nativeElement);
        this.startDetectionLoop();
      }
    }, 500); 
  }

  private stopProcess() {
    if (this.detectInterval) {
      clearInterval(this.detectInterval);
      this.detectInterval = null;
    }
    if (this.videoElement && this.videoElement.nativeElement) {
      this.faceService.stopCamera(this.videoElement.nativeElement);
    }
  }

  private startDetectionLoop() {
    this.detectInterval = setInterval(async () => {
      if (!this.videoElement?.nativeElement || this.isProcessing()) return;
      if (this.videoElement.nativeElement.videoWidth === 0) return; // Prevent Box.constructor error when video isn't ready

      this.isProcessing.set(true);
      try {
        const result = await this.faceService.detectFace(this.videoElement.nativeElement);
        this.status.set(result.status);

        if (result.status === 'VALID' && result.descriptor) {
          this.validDuration += this.INTERVAL_TIME;
          if (this.validDuration >= this.CAPTURE_DELAY) {
            this.captureDescriptor(result.descriptor);
          }
        } else {
          this.validDuration = 0;
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.isProcessing.set(false);
      }
    }, this.INTERVAL_TIME);
  }

  private captureDescriptor(descriptor: Float32Array) {
    this.stopProcess();
    this.onSuccess.emit({ descriptor });
  }

  handleHide() {
    this.stopProcess();
    this.onClose.emit();
  }
}
