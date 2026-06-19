import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaceRecognitionService, FaceValidationStatus, HeadPose, FaceBaseline } from '../../../core/services/face-recognition.service';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface FaceRegisterData {
  descriptors: Float32Array[];
}

@Component({
  selector: 'app-face-register-dialog',
  standalone: true,
  imports: [DialogModule, CommonModule, ButtonModule],
  templateUrl: './face-register-dialog.component.html',
  styleUrls: ['./face-register-dialog.component.scss']
})
export class FaceRegisterDialogComponent implements OnInit, OnDestroy {
  visible = input.required<boolean>();
  onClose = output<void>();
  onSuccess = output<FaceRegisterData>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private faceService = inject(FaceRecognitionService);

  step = signal<number>(0); // 0: calibration, 1-7: poses
  status = signal<FaceValidationStatus>('INITIALIZING');
  currentDetectedPose = signal<HeadPose>('UNKNOWN');
  isProcessing = signal<boolean>(false);
  progress = signal<number>(0);
  descriptors = signal<Float32Array[]>([]);
  baseline = signal<FaceBaseline | null>(null);

  private calibrationSamples: { turnRatio: number; tiltRatio: number }[] = [];

  currentX = signal<number>(50);
  currentY = signal<number>(50);

  readonly targetX = computed(() => {
    const pose = this.currentPoseInfo()?.pose;
    if (!pose) return 50;
    switch (pose) {
      case 'RIGHT': return 25;
      case 'LEFT': return 75;
      case 'UP_RIGHT': return 25;
      case 'UP_LEFT': return 75;
      case 'DOWN_RIGHT': return 25;
      case 'DOWN_LEFT': return 75;
      default: return 50;
    }
  });

  readonly targetY = computed(() => {
    const pose = this.currentPoseInfo()?.pose;
    if (!pose) return 50;
    switch (pose) {
      case 'UP_RIGHT':
      case 'UP_LEFT':
        return 25;
      case 'DOWN_RIGHT':
      case 'DOWN_LEFT':
        return 75;
      default:
        return 50;
    }
  });

  readonly POSES: { pose: HeadPose; label: string; instruction: string }[] = [
    { pose: 'STRAIGHT', label: 'STRAIGHT', instruction: 'Bước 1/7: Nhìn thẳng vào camera' },
    { pose: 'RIGHT', label: 'RIGHT', instruction: 'Bước 2/7: Xoay nhẹ mặt sang PHẢI' },
    { pose: 'UP_RIGHT', label: 'UP_RIGHT', instruction: 'Bước 3/7: Ngửa nhẹ mặt sang PHẢI' },
    { pose: 'DOWN_RIGHT', label: 'DOWN_RIGHT', instruction: 'Bước 4/7: Cúi nhẹ mặt sang PHẢI' },
    { pose: 'DOWN_LEFT', label: 'DOWN_LEFT', instruction: 'Bước 5/7: Cúi nhẹ mặt sang TRÁI' },
    { pose: 'LEFT', label: 'LEFT', instruction: 'Bước 6/7: Xoay nhẹ mặt sang TRÁI' },
    { pose: 'UP_LEFT', label: 'UP_LEFT', instruction: 'Bước 7/7: Ngửa nhẹ mặt sang TRÁI' },
  ];

  currentPoseInfo = computed(() => {
    const s = this.step();
    return s >= 1 && s <= 7 ? this.POSES[s - 1] : null;
  });

  stepInstruction = computed(() => {
    if (this.step() === 0) return 'Đang tự động cân chỉnh camera...';
    return this.currentPoseInfo()?.instruction || 'Hoàn tất';
  });

  feedbackText = computed(() => {
    if (!this.faceService.isReady()) return 'Đang tải AI Model...';
    
    if (this.status() !== 'VALID') {
      switch (this.status()) {
        case 'INITIALIZING': return 'Đang khởi tạo Camera...';
        case 'NO_FACE': return 'Không tìm thấy khuôn mặt';
        case 'MULTIPLE_FACES': return 'Chỉ được có một khuôn mặt';
        case 'TOO_CLOSE': return 'Đưa mặt ra xa hơn';
        case 'TOO_FAR': return 'Đưa mặt lại gần hơn';
        case 'NOT_CENTERED': return 'Giữ mặt trong khung';
        default: return '';
      }
    }

    if (this.step() === 0) {
      return 'Vui lòng nhìn thẳng và giữ yên để thiết lập mốc chuẩn camera...';
    }

    const targetPose = this.currentPoseInfo()?.pose;
    const detected = this.currentDetectedPose();
    if (detected !== targetPose) {
      return 'Vui lòng chỉnh lại góc mặt cho đúng hướng dẫn';
    }

    return 'Giữ yên khuôn mặt...';
  });

  private detectInterval: any;
  private validDuration = 0; // ms
  private readonly CAPTURE_DELAY = 1000; // 1.0s cho mỗi tư thế đăng ký
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
    this.step.set(0);
    this.status.set('INITIALIZING');
    this.currentDetectedPose.set('UNKNOWN');
    this.validDuration = 0;
    this.progress.set(0);
    this.isProcessing.set(false);
    this.descriptors.set([]);
    this.currentX.set(50);
    this.currentY.set(50);
    this.baseline.set(null);
    this.calibrationSamples = [];
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
      if (this.videoElement.nativeElement.videoWidth === 0) return;

      this.isProcessing.set(true);
      try {
        const result = await this.faceService.detectFace(
          this.videoElement.nativeElement, 
          this.baseline() || undefined
        );
        this.status.set(result.status);

        if (result.status === 'VALID' && result.descriptor && result.liveness) {
          // Calibration phase: collect 5 samples (1.0s) of straight-looking face
          if (this.step() === 0) {
            this.calibrationSamples.push({
              turnRatio: result.liveness.turnRatio,
              tiltRatio: result.liveness.tiltRatio
            });
            const percent = Math.min(100, Math.floor((this.calibrationSamples.length / 5) * 100));
            this.progress.set(percent);

            if (this.calibrationSamples.length >= 5) {
              const avgTurn = this.calibrationSamples.reduce((acc, s) => acc + s.turnRatio, 0) / 5;
              const avgTilt = this.calibrationSamples.reduce((acc, s) => acc + s.tiltRatio, 0) / 5;
              
              this.baseline.set({
                turnRatio: avgTurn,
                tiltRatio: avgTilt
              });
              
              this.step.set(1);
              this.progress.set(0);
            }
            this.isProcessing.set(false);
            return;
          }

          const targetPose = this.currentPoseInfo()?.pose;
          const detectedPose = result.liveness.detectedPose;
          this.currentDetectedPose.set(detectedPose);

          // Update position for target radar HUD using normalized ratios
          const normTurn = result.liveness.turnRatio / this.baseline()!.turnRatio;
          const normTilt = result.liveness.tiltRatio / this.baseline()!.tiltRatio;
          
          const x = Math.max(15, Math.min(85, 50 + (normTurn - 1.0) * 115));
          const y = Math.max(15, Math.min(85, 50 + (normTilt - 1.0) * 160));
          this.currentX.set(x);
          this.currentY.set(y);

          if (detectedPose === targetPose) {
            this.validDuration += this.INTERVAL_TIME;
            const currentProgress = Math.min(100, Math.floor((this.validDuration / this.CAPTURE_DELAY) * 100));
            this.progress.set(currentProgress);

            if (this.validDuration >= this.CAPTURE_DELAY) {
              this.captureDescriptor(result.descriptor);
            }
          } else {
            this.validDuration = 0;
            this.progress.set(0);
          }
        } else {
          this.validDuration = 0;
          this.progress.set(0);
          this.currentDetectedPose.set('UNKNOWN');
          this.currentX.set(50);
          this.currentY.set(50);
          if (this.step() === 0) {
            this.calibrationSamples = [];
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.isProcessing.set(false);
      }
    }, this.INTERVAL_TIME);
  }

  private captureDescriptor(descriptor: Float32Array) {
    this.validDuration = 0;
    this.progress.set(0);
    const currentList = this.descriptors();
    const newList = [...currentList, descriptor];
    this.descriptors.set(newList);

    if (this.step() < 7) {
      this.step.update(s => s + 1);
    } else {
      this.stopProcess();
      this.onSuccess.emit({ descriptors: newList });
    }
  }

  getPoseShortLabel(pose: HeadPose): string {
    switch (pose) {
      case 'STRAIGHT': return 'Thẳng';
      case 'RIGHT': return 'Phải';
      case 'UP_RIGHT': return 'Ngửa Phải';
      case 'DOWN_RIGHT': return 'Cúi Phải';
      case 'DOWN_LEFT': return 'Cúi Trái';
      case 'LEFT': return 'Trái';
      case 'UP_LEFT': return 'Ngửa Trái';
      default: return '';
    }
  }

  handleHide() {
    this.stopProcess();
    this.onClose.emit();
  }
}
