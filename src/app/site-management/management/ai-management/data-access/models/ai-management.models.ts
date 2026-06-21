export type AiRole = 'ADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';
export type AiAgentStatus = 'ACTIVE' | 'INACTIVE';
export type AiDatasetStatus = 'ACTIVE' | 'ARCHIVED';
export type AiDocumentStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface AiDocument {
  id: string;
  datasetId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  ingestStatus: AiDocumentStatus;
  chunkCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiDataset {
  id: string;
  name: string;
  description?: string | null;
  status: AiDatasetStatus;
  createdBy?: string | null;
  documents: AiDocument[];
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgent {
  id: string;
  name: string;
  description?: string | null;
  status: AiAgentStatus;
  assignedRole: AiRole;
  priority: number;
  systemPrompt: string;
  guardrails?: string | null;
  temperature: number;
  maxTokens: number;
  topK: number;
  scoreThreshold: number;
  fallbackMessage?: string | null;
  handoffEnabled: boolean;
  handoffThreshold: number;
  datasets: AiDataset[];
  datasetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentPayload {
  name: string;
  description: string | null;
  status: AiAgentStatus;
  assignedRole: AiRole;
  priority: number;
  systemPrompt: string;
  guardrails: string | null;
  temperature: number;
  maxTokens: number;
  topK: number;
  scoreThreshold: number;
  fallbackMessage: string | null;
  handoffEnabled: boolean;
  handoffThreshold: number;
  datasetIds: string[];
}

export interface AiDatasetPayload {
  name: string;
  description: string | null;
  status: AiDatasetStatus;
}

export interface AiDemoResult {
  content: string;
  fallback: boolean;
  handoffRecommended: boolean;
  retrievedContext: AiRetrievedContext[];
}

export interface AiRetrievedContext {
  id: string;
  content: string;
  score: number;
  source?: string | null;
  datasetId?: string | null;
  documentId?: string | null;
}

export const AI_ROLES: AiRole[] = ['CUSTOMER', 'EMPLOYEE', 'MANAGER', 'OWNER', 'ADMIN'];

export function createEmptyAgentPayload(): AiAgentPayload {
  return {
    name: '',
    description: '',
    status: 'INACTIVE',
    assignedRole: 'CUSTOMER',
    priority: 0,
    systemPrompt: 'Ban la tro ly AI cua ZenTech. Hay tu van tu nhien, ngan gon, lich su, bang tieng Viet.',
    guardrails: 'Dung dataset khi cau hoi lien quan. Neu khong co context phu hop, van tro chuyen binh thuong, hoi them thong tin hoac dua ra tu van tong quat. Chi noi ro gioi han khi cau hoi can du lieu chinh xac ma agent chua co can cu.',
    temperature: 0.3,
    maxTokens: 1000,
    topK: 5,
    scoreThreshold: 0.35,
    fallbackMessage: 'Hien tai minh chua co du can cu de tra loi chinh xac phan nay. Ban co the bo sung them thong tin hoac lien he nhan vien phu trach.',
    handoffEnabled: true,
    handoffThreshold: 0.5,
    datasetIds: [],
  };
}

export function toAgentPayload(agent: AiAgent): AiAgentPayload {
  return {
    name: agent.name,
    description: agent.description ?? '',
    status: agent.status,
    assignedRole: agent.assignedRole,
    priority: agent.priority,
    systemPrompt: agent.systemPrompt,
    guardrails: agent.guardrails ?? '',
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    topK: agent.topK,
    scoreThreshold: agent.scoreThreshold,
    fallbackMessage: agent.fallbackMessage ?? '',
    handoffEnabled: agent.handoffEnabled,
    handoffThreshold: agent.handoffThreshold,
    datasetIds: agent.datasets.map(dataset => dataset.id),
  };
}
