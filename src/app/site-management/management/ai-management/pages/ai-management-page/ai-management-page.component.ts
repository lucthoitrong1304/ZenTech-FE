import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideBot,
  LucideDatabase,
  LucideFileText,
  LucideFilter,
  LucidePlay,
  LucidePlus,
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
  AI_ROLES,
  AiAgent,
  AiAgentPayload,
  AiDataset,
  AiDatasetPayload,
  AiDocument,
  AiDemoResult,
  AiRole,
  createEmptyAgentPayload,
  toAgentPayload,
} from '../../data-access/models/ai-management.models';
import { AiManagementService } from '../../data-access/services/ai-management.service';

type AgentDetailTab = 'overview' | 'settings' | 'datasets' | 'demo';
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
    DecimalPipe,
    LucideBot,
    LucideDatabase,
    LucideFileText,
    LucideFilter,
    LucidePlay,
    LucidePlus,
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

  protected readonly roles = AI_ROLES;

  protected readonly agents = signal<AiAgent[]>([]);
  protected readonly datasets = signal<AiDataset[]>([]);
  protected readonly detailTab = signal<AgentDetailTab>('overview');
  protected readonly detailTabs: { id: AgentDetailTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Tổng quan', icon: 'bot' },
    { id: 'settings', label: 'Cấu hình', icon: 'save' },
    { id: 'datasets', label: 'Dataset', icon: 'database' },
    { id: 'demo', label: 'Demo', icon: 'play' },
  ];
  protected readonly selectedAgentId = signal<string | null>(null);
  protected readonly creatingNewAgent = signal(false);
  protected readonly agentKeyword = signal('');
  protected readonly agentStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  protected readonly agentRoleFilter = signal<'ALL' | AiRole>('ALL');
  protected readonly agentDraft = signal<AiAgentPayload>(createEmptyAgentPayload());
  protected readonly datasetDraft = signal<AiDatasetPayload>({
    name: '',
    description: '',
    status: 'ACTIVE',
  });
  protected readonly demoMessage = signal('');
  protected readonly demoMessages = signal<DemoMessage[]>([]);
  protected readonly demoResult = signal<AiDemoResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly savingAgent = signal(false);
  protected readonly savingDataset = signal(false);
  protected readonly uploadingDatasetId = signal<string | null>(null);
  protected readonly demoLoading = signal(false);

  protected readonly selectedAgent = computed(() => {
    const id = this.selectedAgentId();
    return this.agents().find(agent => agent.id === id) ?? null;
  });
  protected readonly attachedDatasets = computed(() => {
    const ids = new Set(this.agentDraft().datasetIds);
    return this.datasets().filter(dataset => ids.has(dataset.id));
  });
  protected readonly availableDatasets = computed(() => {
    const ids = new Set(this.agentDraft().datasetIds);
    return this.datasets().filter(dataset => !ids.has(dataset.id));
  });
  protected readonly filteredAgents = computed(() => {
    const keyword = this.agentKeyword().trim().toLowerCase();
    const status = this.agentStatusFilter();
    const role = this.agentRoleFilter();

    return this.agents().filter(agent => {
      const matchesKeyword =
        !keyword ||
        agent.name.toLowerCase().includes(keyword) ||
        (agent.description ?? '').toLowerCase().includes(keyword) ||
        agent.assignedRole.toLowerCase().includes(keyword);
      const matchesStatus = status === 'ALL' || agent.status === status;
      const matchesRole = role === 'ALL' || agent.assignedRole === role;
      return matchesKeyword && matchesStatus && matchesRole;
    });
  });
  protected readonly activeAgentsCount = computed(() => this.agents().filter(agent => agent.status === 'ACTIVE').length);
  protected readonly readyDocumentsCount = computed(() =>
    this.datasets().flatMap(dataset => dataset.documents).filter(document => document.ingestStatus === 'READY').length
  );

  constructor() {
    this.loadAll();

    effect(() => {
      const agents = this.agents();
      if (!this.creatingNewAgent() && !this.selectedAgentId() && agents.length > 0) {
        untracked(() => this.selectAgent(agents[0]));
      }
    });
  }

  protected loadAll(): void {
    this.loading.set(true);
    this.aiManagementService
      .getAgents()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: agents => this.agents.set(agents),
        error: () => this.toastService.error('Không thể tải danh sách AI agent.'),
      });

    this.aiManagementService.getDatasets().subscribe({
      next: datasets => this.datasets.set(datasets),
      error: () => this.toastService.error('Không thể tải dataset AI.'),
    });
  }

  protected newAgent(): void {
    this.creatingNewAgent.set(true);
    this.selectedAgentId.set(null);
    this.agentDraft.set(createEmptyAgentPayload());
    this.demoResult.set(null);
    this.demoMessages.set([]);
    this.detailTab.set('settings');
  }

  protected selectAgent(agent: AiAgent): void {
    this.creatingNewAgent.set(false);
    this.selectedAgentId.set(agent.id);
    this.agentDraft.set(toAgentPayload(agent));
    this.demoMessage.set('');
    this.demoResult.set(null);
    this.demoMessages.set([]);
    this.detailTab.set('overview');
  }

  protected selectAgentById(agentId: string): void {
    const agent = this.agents().find(item => item.id === agentId);
    if (agent) {
      this.selectAgent(agent);
    }
  }

  protected editAgent(agent: AiAgent): void {
    this.selectAgent(agent);
    this.detailTab.set('settings');
  }

  protected setDetailTab(tab: AgentDetailTab): void {
    this.detailTab.set(tab);
  }

  protected setAgentStatusFilter(value: string): void {
    if (value === 'ACTIVE' || value === 'INACTIVE') {
      this.agentStatusFilter.set(value);
      return;
    }
    this.agentStatusFilter.set('ALL');
  }

  protected setAgentRoleFilter(value: string): void {
    if (this.roles.includes(value as AiRole)) {
      this.agentRoleFilter.set(value as AiRole);
      return;
    }
    this.agentRoleFilter.set('ALL');
  }

  protected updateAgentDraft(patch: Partial<AiAgentPayload>): void {
    this.agentDraft.update(current => ({ ...current, ...patch }));
  }

  protected setAssignedRole(role: AiRole): void {
    this.updateAgentDraft({ assignedRole: role });
  }

  protected toggleDataset(datasetId: string, checked: boolean): void {
    const current = new Set(this.agentDraft().datasetIds);
    if (checked) {
      current.add(datasetId);
    } else {
      current.delete(datasetId);
    }
    this.updateAgentDraft({ datasetIds: Array.from(current) });
  }

  protected saveAgent(): void {
    const payload = this.agentDraft();
    if (!payload.name.trim() || !payload.systemPrompt.trim() || !payload.assignedRole) {
      this.toastService.error('Vui lòng nhập tên, prompt và chọn một vai trò cho agent.');
      return;
    }

    this.savingAgent.set(true);
    const selectedId = this.selectedAgentId();
    const request$ = selectedId
      ? this.aiManagementService.updateAgent(selectedId, payload)
      : this.aiManagementService.createAgent(payload);

    request$
      .pipe(finalize(() => this.savingAgent.set(false)))
      .subscribe({
        next: agent => {
          this.upsertAgent(agent);
          this.creatingNewAgent.set(false);
          this.selectAgent(agent);
          this.toastService.success('Đã lưu AI agent.');
        },
        error: err => this.toastService.error(readError(err, 'Không thể lưu AI agent.')),
      });
  }

  protected saveAgentDatasets(): void {
    const selectedId = this.selectedAgentId();
    if (!selectedId) {
      return;
    }

    this.savingAgent.set(true);
    this.aiManagementService
      .updateAgent(selectedId, this.agentDraft())
      .pipe(finalize(() => this.savingAgent.set(false)))
      .subscribe({
        next: agent => {
          this.upsertAgent(agent);
          this.selectAgent(agent);
          this.toastService.success('Đã cập nhật dataset cho agent.');
        },
        error: err => this.toastService.error(readError(err, 'Không thể cập nhật dataset cho agent.')),
      });
  }

  protected deleteAgent(agent: AiAgent): void {
    if (!confirm(`Xóa agent "${agent.name}"?`)) {
      return;
    }

    this.aiManagementService.deleteAgent(agent.id).subscribe({
      next: () => {
        this.agents.update(agents => agents.filter(item => item.id !== agent.id));
        if (this.selectedAgentId() === agent.id) {
          this.selectedAgentId.set(null);
          this.agentDraft.set(createEmptyAgentPayload());
          this.creatingNewAgent.set(false);
        }
        this.toastService.success('Đã xóa AI agent.');
      },
      error: () => this.toastService.error('Không thể xóa AI agent.'),
    });
  }

  protected updateDatasetDraft(patch: Partial<AiDatasetPayload>): void {
    this.datasetDraft.update(current => ({ ...current, ...patch }));
  }

  protected createDataset(): void {
    const payload = this.datasetDraft();
    if (!payload.name.trim()) {
      this.toastService.error('Vui lòng nhập tên dataset.');
      return;
    }

    this.savingDataset.set(true);
    this.aiManagementService
      .createDataset(payload)
      .pipe(finalize(() => this.savingDataset.set(false)))
      .subscribe({
        next: dataset => {
          this.datasets.update(datasets => [dataset, ...datasets]);
          if (this.selectedAgentId()) {
            this.updateAgentDraft({ datasetIds: [...this.agentDraft().datasetIds, dataset.id] });
            this.saveAgentDatasets();
          }
          this.datasetDraft.set({ name: '', description: '', status: 'ACTIVE' });
          this.toastService.success('Đã tạo dataset.');
        },
        error: () => this.toastService.error('Không thể tạo dataset.'),
      });
  }

  protected detachDataset(datasetId: string): void {
    this.updateAgentDraft({
      datasetIds: this.agentDraft().datasetIds.filter(id => id !== datasetId),
    });
    this.saveAgentDatasets();
  }

  protected attachDataset(datasetId: string): void {
    if (!datasetId) {
      return;
    }
    const current = new Set(this.agentDraft().datasetIds);
    current.add(datasetId);
    this.updateAgentDraft({ datasetIds: Array.from(current) });
    this.saveAgentDatasets();
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
          this.toastService.success('Đã upload và ingest tài liệu.');
        },
        error: err => this.toastService.error(readError(err, 'Không thể upload tài liệu.')),
      });
  }

  protected reingestDocument(document: AiDocument): void {
    this.aiManagementService.reingestDocument(document.id).subscribe({
      next: updatedDocument => {
        this.upsertDocument(document.datasetId, updatedDocument);
        this.toastService.success('Đã reingest tài liệu.');
      },
      error: () => this.toastService.error('Không thể reingest tài liệu.'),
    });
  }

  protected deleteDocument(document: AiDocument): void {
    if (!confirm(`Xóa tài liệu "${document.fileName}"?`)) {
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
        this.toastService.success('Đã xóa tài liệu.');
      },
      error: () => this.toastService.error('Không thể xóa tài liệu.'),
    });
  }

  protected runDemo(): void {
    const agentId = this.selectedAgentId();
    const message = this.demoMessage().trim();
    if (!agentId || !message) {
      this.toastService.error('Chọn agent và nhập câu hỏi demo.');
      return;
    }

    this.demoLoading.set(true);
    this.demoResult.set(null);
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
    this.aiManagementService
      .demoAgent(agentId, message, history)
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
        error: () => {
          this.demoMessages.update(messages => messages.filter(item => item.id !== userMessage.id));
          this.demoMessage.set(message);
          this.toastService.error('Không thể demo agent.');
        },
      });
  }

  protected clearDemoConversation(): void {
    this.demoMessages.set([]);
    this.demoResult.set(null);
    this.demoMessage.set('');
  }

  protected datasetAttached(datasetId: string): boolean {
    return this.agentDraft().datasetIds.includes(datasetId);
  }

  protected roleAttached(role: AiRole): boolean {
    return this.agentDraft().assignedRole === role;
  }

  protected roleLabel(role: AiRole): string {
    const labels: Record<AiRole, string> = {
      ADMIN: 'Admin',
      OWNER: 'Owner',
      MANAGER: 'Manager',
      EMPLOYEE: 'Nhân viên',
      CUSTOMER: 'Khách hàng',
    };
    return labels[role];
  }

  protected documentStatusLabel(status: AiDocument['ingestStatus']): string {
    const labels: Record<AiDocument['ingestStatus'], string> = {
      UPLOADED: 'Đã tải lên',
      PROCESSING: 'Đang xử lý',
      READY: 'Sẵn sàng',
      FAILED: 'Lỗi ingest',
    };
    return labels[status];
  }

  protected documentStatusTone(status: AiDocument['ingestStatus']): string {
    if (status === 'READY') return 'ready';
    if (status === 'FAILED') return 'failed';
    if (status === 'PROCESSING') return 'processing';
    return 'uploaded';
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  protected syncingProducts = signal(false);

  protected syncProducts(): void {
    this.syncingProducts.set(true);
    this.aiManagementService
      .reindexProducts()
      .pipe(finalize(() => this.syncingProducts.set(false)))
      .subscribe({
        next: () => this.toastService.success('Đồng bộ sản phẩm qua AI thành công!'),
        error: (err) => this.toastService.error(readError(err, 'Đồng bộ sản phẩm qua AI thất bại.')),
      });
  }

  private upsertAgent(agent: AiAgent): void {
    this.agents.update(agents => {
      const exists = agents.some(item => item.id === agent.id);
      return exists ? agents.map(item => (item.id === agent.id ? agent : item)) : [agent, ...agents];
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
