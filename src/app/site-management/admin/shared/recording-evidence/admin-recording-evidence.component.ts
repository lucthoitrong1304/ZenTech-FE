import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  ViewChild,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordingEvidenceResult } from './recording-evidence.models';
import { RecordingEvidenceService } from './recording-evidence.service';
import { Subscription } from 'rxjs';

type RecordingEvidenceState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-admin-recording-evidence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-recording-evidence.component.html',
  styleUrl: './admin-recording-evidence.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRecordingEvidenceComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly recordingEvidenceService = inject(RecordingEvidenceService);

  readonly email = input<string | null | undefined>(null);
  readonly timestamp = input<Date | string | number | null | undefined>(null);
  readonly traceId = input<string | null | undefined>(null);
  readonly title = input<string>('Record liên quan');
  readonly contextLabel = input<string | null | undefined>(null);
  readonly clipBeforeMs = input<number>(15_000);
  readonly clipAfterMs = input<number>(45_000);

  @ViewChild('playerContainer') private playerContainer?: ElementRef<HTMLDivElement>;

  protected readonly state = signal<RecordingEvidenceState>('idle');
  protected readonly message = signal('Chưa có record liên quan.');
  protected readonly evidence = signal<RecordingEvidenceResult | null>(null);

  private requestId = 0;
  private playerInstance: any = null;
  private subscription: Subscription | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.reload();
  }

  ngOnChanges(): void {
    if (this.viewReady) {
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.destroyPlayer();
  }

  protected reload(): void {
    const email = (this.email() || '').trim();
    const timestamp = this.timestamp();
    const traceId = (this.traceId() || '').trim();
    const clipBeforeMs = this.clipBeforeMs() ?? 15_000;
    const clipAfterMs = this.clipAfterMs() ?? 45_000;

    this.subscription?.unsubscribe();
    this.destroyPlayer();
    this.evidence.set(null);

    if (!email) {
      this.state.set('empty');
      this.message.set('Chưa có email để tìm record liên quan.');
      return;
    }
    if (!timestamp) {
      this.state.set('empty');
      this.message.set('Chưa có thời điểm để tìm record liên quan.');
      return;
    }

    const requestId = ++this.requestId;
    this.state.set('loading');
    this.message.set('Đang tải record liên quan...');

    this.subscription = this.recordingEvidenceService.resolveEvidence({
      email,
      timestamp,
      traceId,
      clipBeforeMs,
      clipAfterMs
    }).subscribe({
      next: (result) => {
        if (requestId !== this.requestId) return;
        this.evidence.set(result);
        this.renderPlayer(result, requestId);
      },
      error: (err) => {
        if (requestId !== this.requestId) return;
        this.state.set(err?.message === 'MISSING_EMAIL' || err?.message === 'MASKED_EMAIL' || err?.message === 'INVALID_TIMESTAMP' || err?.message === 'NO_SESSION' || err?.message === 'NO_EVENTS' || err?.message === 'NO_CLIP_EVENTS' ? 'empty' : 'error');
        this.message.set(this.messageForError(err));
      }
    });
  }

  protected formatDate(value: Date | string | number | null | undefined): string {
    if (!value) return 'N/A';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  protected formatDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + seconds.toString().padStart(2, '0');
  }

  private renderPlayer(result: RecordingEvidenceResult, requestId: number): void {
    this.loadStyle('/rrweb/zt-player-view.css');
    this.loadScript('/rrweb/zt-player-view.js').then(() => {
      if (requestId !== this.requestId) return;

      const win = window as any;
      const container = this.playerContainer?.nativeElement;
      if (!win.rrwebPlayer || !container) {
        this.state.set('error');
        this.message.set('Không tải được rrweb player.');
        return;
      }

      setTimeout(() => {
        if (requestId !== this.requestId) return;
        const target = this.playerContainer?.nativeElement;
        if (!target) return;
        target.innerHTML = '';

        try {
          this.playerInstance = new win.rrwebPlayer({
            target,
            props: {
              events: result.events,
              width: target.clientWidth || 640,
              height: 430,
              autoPlay: false
            }
          });
          this.playerInstance.goto(0);
          this.state.set('ready');
          this.message.set('');
        } catch (err) {
          console.error('Failed to initialize recording evidence player:', err);
          this.state.set('error');
          this.message.set('Không hiển thị được record liên quan.');
        }
      }, 80);
    }).catch((err) => {
      console.error('Failed to load recording evidence player:', err);
      this.state.set('error');
      this.message.set('Không tải được player record.');
    });
  }

  private destroyPlayer(): void {
    if (this.playerInstance) {
      try {
        this.playerInstance.pause?.();
        this.playerInstance.$destroy?.();
        this.playerInstance.destroy?.();
      } catch (err) {
        console.warn('Failed to destroy recording evidence player:', err);
      }
      this.playerInstance = null;
    }

    const container = this.playerContainer?.nativeElement;
    if (container) {
      container.innerHTML = '';
    }
  }

  private loadScript(src: string): Promise<void> {
    const existing = document.querySelector<HTMLScriptElement>('script[data-recording-evidence-player="true"]');
    if (existing) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset['recordingEvidencePlayer'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('PLAYER_SCRIPT_FAILED'));
      document.body.appendChild(script);
    });
  }

  private loadStyle(href: string): void {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  private messageForError(err: any): string {
    switch (err?.message) {
      case 'MISSING_EMAIL':
        return 'Chưa có email để tìm record liên quan.';
      case 'MASKED_EMAIL':
        return 'Email trong log đã được ẩn nên chưa thể đối chiếu record.';
      case 'INVALID_TIMESTAMP':
        return 'Thời điểm log không hợp lệ nên chưa tìm được record.';
      case 'NO_SESSION':
        return 'Không tìm thấy phiên record chứa thời điểm này.';
      case 'NO_EVENTS':
        return 'Phiên record này chưa có dữ liệu replay.';
      case 'NO_CLIP_EVENTS':
        return 'Không có sự kiện replay trong đoạn liên quan.';
      default:
        return 'Không tải được record liên quan.';
    }
  }
}
