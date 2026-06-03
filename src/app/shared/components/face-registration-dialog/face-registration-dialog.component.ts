import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaceRecognitionService, FaceValidationStatus } from '../../../core/services/face-recognition.service';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface FaceRegistrationData {
  descriptors: Float32Array[];
}

@Component({
  selector: 'app-face-registration-dialog',
  standalone: true,
  imports: [DialogModule, CommonModule, ButtonModule],
  templateUrl: './face-registration-dialog.component.html',
  styleUrls: ['./face-registration-dialog.component.scss']
})
export class FaceRegistrationDialogComponent implements OnInit, OnDestroy {
  visible = input.required<boolean>();
  onClose = output<void>();
  onSuccess = output<FaceRegistrationData>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private faceService = inject(FaceRecognitionService);

  step = signal<number>(1); // 1: Front, 2: Left, 3: Right
  status = signal<FaceValidationStatus>('INITIALIZING');
  isProcessing = signal<boolean>(false);
  descriptors = signal<Float32Array[]>([]);

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
      case 'VALID': return 'Giữ yên...';
      default: return '';
    }
  });

  stepInstruction = computed(() => {
    switch (this.step()) {
      case 1: return 'Bước 1/3: Nhìn thẳng vào camera';
      case 2: return 'Bước 2/3: Nghiêng nhẹ mặt sang TRÁI';
      case 3: return 'Bước 3/3: Nghiêng nhẹ mặt sang PHẢI';
      default: return 'Hoàn tất';
    }
  });

  private detectInterval: any;
  private validDuration = 0; // ms
  private readonly CAPTURE_DELAY = 1500; // 1.5s
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
    this.step.set(1);
    this.status.set('INITIALIZING');
    this.descriptors.set([]);
    this.validDuration = 0;
    this.isProcessing.set(false);
  }

  private async startProcess() {
    if (!this.faceService.isReady()) {
      // wait a bit if not ready
      await this.faceService.loadModels();
    }

    setTimeout(async () => {
      if (this.videoElement && this.videoElement.nativeElement) {
        await this.faceService.startCamera(this.videoElement.nativeElement);
        this.startDetectionLoop();
      }
    }, 500); // Wait for Dialog to render
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
    this.validDuration = 0; // Reset for next step
    const currentList = this.descriptors();
    const newList = [...currentList, descriptor];
    this.descriptors.set(newList);

    if (this.step() < 3) {
      this.step.update(s => s + 1);
    } else {
      // Done
      this.stopProcess();
      this.onSuccess.emit({ descriptors: newList });
    }
  }

  handleHide() {
    this.stopProcess();
    this.onClose.emit();
  }
}
