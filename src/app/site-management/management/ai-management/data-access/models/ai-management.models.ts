export type AiDatasetStatus = 'ACTIVE' | 'ARCHIVED';
export type AiDocumentStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
export type AiProductVectorSyncStatus = 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'FAILED';
export type AiProductVectorFilter = 'ALL' | 'SYNCED' | 'NOT_SYNCED' | 'FAILED' | 'DRIFT';

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

export interface AiDatasetPayload {
  name: string;
  description: string | null;
  status: AiDatasetStatus;
}

export interface AiProductVectorStatus {
  productId: string;
  variantId: string;
  productName: string;
  variantName?: string | null;
  imageKey?: string | null;
  syncStatus: AiProductVectorSyncStatus;
  lastSyncedAt?: string | null;
  lastVerifiedAt?: string | null;
  qdrantPresent?: boolean | null;
  errorMessage?: string | null;
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
