import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArchive,
  LucideBot,
  LucideCheckCircle2,
  LucideDatabase,
  LucideFileText,
  LucidePlay,
  LucideRefreshCw,
  LucideSave,
  LucideSearch,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { finalize } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  AiDataset,
  AiDatasetPayload,
  AiDemoResult,
  AiDocument,
  AiProductVectorFilter,
  AiProductVectorStatus,
} from '../../data-access/models/ai-management.models';
import { AiManagementService } from '../../data-access/services/ai-management.service';

type AiManagementTab = 'datasets' | 'products' | 'demo';
type DemoMessageRole = 'customer' | 'assistant';

interface DemoMessage {
  id: string;
  role: DemoMessageRole;
  content: string;
  result?: AiDemoResult;
}

@Component({
  selector: 'app-ai-management-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DecimalPipe,
    LucideArchive,
    LucideBot,
    LucideCheckCircle2,
    LucideDatabase,
    LucideFileText,
    LucidePlay,
    LucideRefreshCw,
    LucideSave,
    LucideSearch,
    LucideTrash2,
    LucideUpload,
    MarkdownComponent,
  ],
  templateUrl: './ai-management-page.component.html',
  styleUrl: './ai-management-page.component.css',
})
export class AiManagementPageComponent {
  private readonly aiManagementService = inject(AiManagementService);
  private readonly toastService = inject(ToastService);

  protected readonly activeTab = signal<AiManagementTab>('datasets');
  protected readonly tabs: { id: AiManagementTab; label: string; icon: string }[] = [
    { id: 'datasets', label: 'Tap du lieu', icon: 'database' },
    { id: 'products', label: 'San pham tren Qdrant', icon: 'check' },
    { id: 'demo', label: 'Test demo', icon: 'bot' },
  ];
  protected readonly productFilters: AiProductVectorFilter[] = ['ALL', 'SYNCED', 'NOT_SYNCED', 'FAILED', 'DRIFT'];

  protected readonly datasets = signal<AiDataset[]>([]);
  protected readonly productStatuses = signal<AiProductVectorStatus[]>([]);
  protected readonly datasetDraft = signal<AiDatasetPayload>({ name: '', description: '', status: 'ACTIVE' });
  protected readonly editingDatasetId = signal<string | null>(null);
  protected readonly datasetKeyword = signal('');
  protected readonly productKeyword = signal('');
  protected readonly productFilter = signal<AiProductVectorFilter>('ALL');
  protected readonly demoMessage = signal('');
  protected readonly demoMessages = signal<DemoMessage[]>([]);
  protected readonly demoResult = signal<AiDemoResult | null>(null);

  protected readonly loadingDatasets = signal(false);
  protected readonly savingDataset = signal(false);
  protected readonly uploadingDatasetId = signal<string | null>(null);
  protected readonly loadingProducts = signal(false);
  protected readonly syncingVariantId = signal<string | null>(null);
  protected readonly verifyingVariantId = signal<string | null>(null);
  protected readonly reindexingProducts = signal(false);
  protected readonly verifyingAllProducts = signal(false);
  protected readonly demoLoading = signal(false);

  protected readonly filteredDatasets = computed(() => {
    const keyword = this.datasetKeyword().trim().toLowerCase();
    return this.datasets().filter(dataset =>
      !keyword ||
      dataset.name.toLowerCase().includes(keyword) ||
      (dataset.description ?? '').toLowerCase().includes(keyword)
    );
  });

  protected readonly filteredProductStatuses = computed(() => {
    const keyword = this.productKeyword().trim().toLowerCase();
    return this.productStatuses().filter(item =>
      !keyword ||
      item.productName.toLowerCase().includes(keyword) ||
      (item.variantName ?? '').toLowerCase().includes(keyword)
    );
  });

  protected readonly activeDatasetCount = computed(() => this.datasets().filter(dataset => dataset.status === 'ACTIVE').length);
  protected readonly readyDocumentCount = computed(() =>
    this.datasets().flatMap(dataset => dataset.documents).filter(document => document.ingestStatus === 'READY').length
  );
  protected readonly syncedProductCount = computed(() =>
    this.productStatuses().filter(item => item.syncStatus === 'SYNCED' && item.qdrantPresent === true).length
  );
  protected readonly driftProductCount = computed(() =>
    this.productStatuses().filter(item => item.syncStatus === 'SYNCED' && item.qdrantPresent === false).length
  );

  constructor() {
    this.loadDatasets();
    this.loadProductStatuses();
  }

  protected setActiveTab(tab: AiManagementTab): void {
    this.activeTab.set(tab);
  }

  protected loadDatasets(): void {
    this.loadingDatasets.set(true);
    this.aiManagementService
      .getDatasets()
      .pipe(finalize(() => this.loadingDatasets.set(false)))
      .subscribe({
        next: datasets => this.datasets.set(datasets),
        error: () => this.toastService.error('Khong the tai danh sach dataset AI.'),
      });
  }

  protected loadProductStatuses(): void {
    this.loadingProducts.set(true);
    this.aiManagementService
      .getProductVectorStatuses(this.productFilter())
      .pipe(finalize(() => this.loadingProducts.set(false)))
      .subscribe({
        next: statuses => this.productStatuses.set(statuses),
        error: () => this.toastService.error('Khong the tai trang thai san pham tren Qdrant.'),
      });
  }

  protected setProductFilter(filter: AiProductVectorFilter): void {
    this.productFilter.set(filter);
    this.loadProductStatuses();
  }

  protected setDatasetStatus(status: string): void {
    this.updateDatasetDraft({ status: status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE' });
  }

  protected updateDatasetDraft(patch: Partial<AiDatasetPayload>): void {
    this.datasetDraft.update(current => ({ ...current, ...patch }));
  }

  protected editDataset(dataset: AiDataset): void {
    this.editingDatasetId.set(dataset.id);
    this.datasetDraft.set({
      name: dataset.name,
      description: dataset.description ?? '',
      status: dataset.status,
    });
  }

  protected cancelEditDataset(): void {
    this.editingDatasetId.set(null);
    this.datasetDraft.set({ name: '', description: '', status: 'ACTIVE' });
  }

  protected saveDataset(): void {
    const payload = this.datasetDraft();
    if (!payload.name.trim()) {
      this.toastService.error('Vui long nhap ten dataset.');
      return;
    }

    const editingId = this.editingDatasetId();
    const request$ = editingId
      ? this.aiManagementService.updateDataset(editingId, payload)
      : this.aiManagementService.createDataset(payload);

    this.savingDataset.set(true);
    request$
      .pipe(finalize(() => this.savingDataset.set(false)))
      .subscribe({
        next: dataset => {
          this.upsertDataset(dataset);
          this.cancelEditDataset();
          this.toastService.success(editingId ? 'Da cap nhat dataset.' : 'Da tao dataset.');
        },
        error: err => this.toastService.error(readError(err, 'Khong the luu dataset.')),
      });
  }

  protected archiveDataset(dataset: AiDataset): void {
    if (!confirm(`Archive dataset "${dataset.name}"?`)) {
      return;
    }

    this.aiManagementService.archiveDataset(dataset.id).subscribe({
      next: updated => {
        this.upsertDataset(updated);
        this.toastService.success('Da archive dataset.');
      },
      error: () => this.toastService.error('Khong the archive dataset.'),
    });
  }

  protected uploadDocument(datasetId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadingDatasetId.set(datasetId);
    this.aiManagementService
      .uploadDocument(datasetId, file)
      .pipe(finalize(() => {
        this.uploadingDatasetId.set(null);
        input.value = '';
      }))
      .subscribe({
        next: document => {
          this.upsertDocument(datasetId, document);
          this.toastService.success('Da upload va ingest tai lieu.');
        },
        error: err => this.toastService.error(readError(err, 'Khong the upload tai lieu.')),
      });
  }

  protected reingestDocument(document: AiDocument): void {
    this.aiManagementService.reingestDocument(document.id).subscribe({
      next: updatedDocument => {
        this.upsertDocument(document.datasetId, updatedDocument);
        this.toastService.success('Da reingest tai lieu.');
      },
      error: () => this.toastService.error('Khong the reingest tai lieu.'),
    });
  }

  protected deleteDocument(document: AiDocument): void {
    if (!confirm(`Xoa tai lieu "${document.fileName}"?`)) {
      return;
    }

    this.aiManagementService.deleteDocument(document.id).subscribe({
      next: () => {
        this.datasets.update(datasets =>
          datasets.map(dataset =>
            dataset.id === document.datasetId
              ? {
                  ...dataset,
                  documents: dataset.documents.filter(item => item.id !== document.id),
                  documentCount: Math.max(0, dataset.documentCount - 1),
                }
              : dataset
          )
        );
        this.toastService.success('Da xoa tai lieu.');
      },
      error: () => this.toastService.error('Khong the xoa tai lieu.'),
    });
  }

  protected syncVariant(item: AiProductVectorStatus): void {
    this.syncingVariantId.set(item.variantId);
    this.aiManagementService
      .syncProductVariant(item.variantId)
      .pipe(finalize(() => this.syncingVariantId.set(null)))
      .subscribe({
        next: updated => {
          this.upsertProductStatus(updated);
          this.toastService.success('Da dong bo san pham qua Qdrant.');
        },
        error: err => {
          this.loadProductStatuses();
          this.toastService.error(readError(err, 'Dong bo san pham that bai.'));
        },
      });
  }

  protected verifyVariant(item: AiProductVectorStatus): void {
    this.verifyingVariantId.set(item.variantId);
    this.aiManagementService
      .verifyProductVariant(item.variantId)
      .pipe(finalize(() => this.verifyingVariantId.set(null)))
      .subscribe({
        next: updated => this.upsertProductStatus(updated),
        error: err => this.toastService.error(readError(err, 'Verify Qdrant that bai.')),
      });
  }

  protected verifyAllProducts(): void {
    this.verifyingAllProducts.set(true);
    this.aiManagementService
      .verifyAllProducts()
      .pipe(finalize(() => this.verifyingAllProducts.set(false)))
      .subscribe({
        next: statuses => {
          this.productStatuses.set(statuses);
          this.toastService.success('Da verify Qdrant cho san pham.');
        },
        error: err => this.toastService.error(readError(err, 'Verify tat ca san pham that bai.')),
      });
  }

  protected reindexProducts(): void {
    this.reindexingProducts.set(true);
    this.aiManagementService
      .reindexProducts()
      .pipe(finalize(() => this.reindexingProducts.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Da bat dau reindex san pham.');
          this.loadProductStatuses();
        },
        error: err => this.toastService.error(readError(err, 'Reindex san pham that bai.')),
      });
  }

  protected runDemo(): void {
    const message = this.demoMessage().trim();
    if (!message) {
      this.toastService.error('Nhap cau hoi demo truoc khi gui.');
      return;
    }

    const userMessage: DemoMessage = {
      id: createMessageId(),
      role: 'customer',
      content: message,
    };
    const history = this.demoMessages().map(item => ({
      role: item.role,
      content: item.content,
    }));
    this.demoMessages.update(messages => [...messages, userMessage]);
    this.demoMessage.set('');
    this.demoResult.set(null);
    this.demoLoading.set(true);

    this.aiManagementService
      .runDemo(message, history)
      .pipe(finalize(() => this.demoLoading.set(false)))
      .subscribe({
        next: result => {
          this.demoResult.set(result);
          this.demoMessages.update(messages => [
            ...messages,
            {
              id: createMessageId(),
              role: 'assistant',
              content: result.content,
              result,
            },
          ]);
        },
        error: err => {
          this.demoMessages.update(messages => messages.filter(item => item.id !== userMessage.id));
          this.demoMessage.set(message);
          this.toastService.error(readError(err, 'Khong the chay demo AI.'));
        },
      });
  }

  protected clearDemoConversation(): void {
    this.demoMessages.set([]);
    this.demoResult.set(null);
    this.demoMessage.set('');
  }

  protected documentStatusLabel(status: AiDocument['ingestStatus']): string {
    const labels: Record<AiDocument['ingestStatus'], string> = {
      UPLOADED: 'Da tai len',
      PROCESSING: 'Dang xu ly',
      READY: 'San sang',
      FAILED: 'Loi ingest',
    };
    return labels[status];
  }

  protected syncStatusLabel(status: AiProductVectorStatus['syncStatus']): string {
    const labels: Record<AiProductVectorStatus['syncStatus'], string> = {
      NOT_SYNCED: 'Chua sync',
      SYNCING: 'Dang sync',
      SYNCED: 'Da sync',
      FAILED: 'Loi',
    };
    return labels[status];
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  protected productQdrantLabel(value: boolean | null | undefined): string {
    if (value === true) return 'Co tren Qdrant';
    if (value === false) return 'Lech Qdrant';
    return 'Chua verify';
  }

  private upsertDataset(dataset: AiDataset): void {
    this.datasets.update(datasets => {
      const exists = datasets.some(item => item.id === dataset.id);
      return exists ? datasets.map(item => (item.id === dataset.id ? dataset : item)) : [dataset, ...datasets];
    });
  }

  private upsertDocument(datasetId: string, document: AiDocument): void {
    this.datasets.update(datasets =>
      datasets.map(dataset => {
        if (dataset.id !== datasetId) {
          return dataset;
        }
        const exists = dataset.documents.some(item => item.id === document.id);
        const documents = exists
          ? dataset.documents.map(item => (item.id === document.id ? document : item))
          : [document, ...dataset.documents];
        return { ...dataset, documents, documentCount: documents.length };
      })
    );
  }

  private upsertProductStatus(status: AiProductVectorStatus): void {
    this.productStatuses.update(statuses => {
      const exists = statuses.some(item => item.variantId === status.variantId);
      return exists ? statuses.map(item => (item.variantId === status.variantId ? status : item)) : [status, ...statuses];
    });
  }
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'error' in error) {
    const body = (error as { error?: { message?: string } }).error;
    if (body?.message) return body.message;
  }
  return fallback;
}
