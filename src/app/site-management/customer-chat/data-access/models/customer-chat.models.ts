export type CustomerChatSessionStatus = 'BOT_CONSULTING' | 'WAITING_FOR_AGENT' | 'AGENT_HANDLING' | 'CLOSED';

export type CustomerChatMessageSender = 'CUSTOMER' | 'AI' | 'STAFF';

export type CustomerChatSharedItemType = 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK';

export type CustomerChatSharedTab = 'ALL' | 'MEDIA' | 'FILES' | 'LINKS';

export type CustomerChatFullSidebarMode = 'DETAILS' | 'SHARED';

export type CustomerChatUploadStatus = 'PENDING' | 'UPLOADING' | 'COMPLETE' | 'FAILED';

export interface CustomerChatParticipant {
  id: string;
  email: string | null;
  name: string;
  roleLabel: string;
  avatarUrl: string | null;
  initials: string;
  online: boolean;
}

export interface CustomerChatProductContext {
  id: string;
  name: string;
  imageUrl: string;
  priceLabel: string;
  stockLabel: string;
}

export interface CustomerChatMessageAttachment {
  id: string;
  type: CustomerChatSharedItemType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CallHistoryData {
  duration: string;
  status: string;
}

export interface CustomerChatMessage {
  id: string;
  sender: CustomerChatMessageSender;
  senderName: string;
  messageType?: ChatMessageType;
  body: string;
  callData?: CallHistoryData;
  sentAtLabel: string;
  attachments: CustomerChatMessageAttachment[];
}

export interface CustomerChatSharedItem {
  id: string;
  type: CustomerChatSharedItemType;
  title: string;
  subtitle: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CustomerChatUpload {
  id: string;
  conversationId: string;
  file: File;
  fileName: string;
  sizeLabel: string;
  progress: number;
  status: CustomerChatUploadStatus;
}

export interface CustomerChatSession {
  id: string;
  status: CustomerChatSessionStatus;
  customer: CustomerChatParticipant;
  assistant: CustomerChatParticipant;
  staff: CustomerChatParticipant | null;
  product: CustomerChatProductContext;
  messages: CustomerChatMessage[];
  sharedItems: CustomerChatSharedItem[];
  lastActivityLabel: string;
}

export interface CustomerChatSendMessagePayload {
  sessionId: string;
  body: string;
  staffJoined: boolean;
}

export interface CustomerChatUploadResult {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: CustomerChatSharedItemType;
}

// ==========================================
// BACKEND DTO MODELS & ENUMS
// ==========================================

export enum ConversationStatus {
  BOT_CONSULTING = 'BOT_CONSULTING',
  WAITING_FOR_AGENT = 'WAITING_FOR_AGENT',
  AGENT_HANDLING = 'AGENT_HANDLING',
  CLOSED = 'CLOSED',
}

export enum ParticipantType {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
  EXPERT = 'EXPERT',
  BOT = 'BOT',
}

export enum ParticipantStatus {
  ACTIVE = 'ACTIVE',
  SILENT = 'SILENT',
  LEFT = 'LEFT',
}

export enum ChatMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  MEDIA = 'MEDIA',
  SYSTEM = 'SYSTEM',
  CALL = 'CALL',
}

export enum ChatAttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
}

export interface ParticipantEmailOwner {
  email?: string | null;
}

export interface ParticipantResponse {
  id: string;
  userType: ParticipantType;
  referenceId: string;
  email?: string | null;
  accountEmail?: string | null;
  userEmail?: string | null;
  participantEmail?: string | null;
  account?: ParticipantEmailOwner | null;
  user?: ParticipantEmailOwner | null;
  employee?: ParticipantEmailOwner | null;
  expert?: ParticipantEmailOwner | null;
  profile?: ParticipantEmailOwner | null;
  status: ParticipantStatus;
  joinedAt: string;
  leftAt: string | null;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface ConversationResponse {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: ConversationStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  participants: ParticipantResponse[];
}

export interface ChatAttachmentResponse {
  id: string;
  fileKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  attachmentType: ChatAttachmentType;
  sortOrder: number;
  mediaUrl?: string;
}

export interface ChatMessageResponse {
  id: string;
  conversationId: string;
  participantId: string;
  senderType: ParticipantType;
  senderReferenceId: string;
  messageType: ChatMessageType;
  content: string;
  attachments: ChatAttachmentResponse[];
  createdAt: string;
  deletedAt: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UploadPresignResponse {
  presignedUrl: string;
  fileKey: string;
  method: string;
  expiresInMinutes: number;
  requiredHeaders: Record<string, string>;
}

// ==========================================
// MAPPER FUNCTIONS
// ==========================================

export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  } catch {
    return 'Vừa xong';
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim();
  return normalized || null;
}

export function resolveParticipantEmail(participant: ParticipantResponse | undefined): string | null {
  const candidateEmails = [
    participant?.email,
    participant?.accountEmail,
    participant?.userEmail,
    participant?.participantEmail,
    participant?.account?.email,
    participant?.user?.email,
    participant?.employee?.email,
    participant?.expert?.email,
    participant?.profile?.email,
  ];

  return candidateEmails.map(normalizeEmail).find((email) => email !== null) ?? null;
}

export function mapToCustomerChatSession(
  conv: ConversationResponse,
  messages: ChatMessageResponse[],
  currentUserAccountId: string | null
): CustomerChatSession {
  const participants = conv.participants || [];

  const customerPart = participants.find((p) => p.userType === ParticipantType.CUSTOMER);
  const botPart = participants.find((p) => p.userType === ParticipantType.BOT);
  const staffPart = participants.find(
    (p) =>
      p.status === ParticipantStatus.ACTIVE &&
      (p.userType === ParticipantType.EMPLOYEE || p.userType === ParticipantType.EXPERT)
  );

  const customer: CustomerChatParticipant = {
    id: customerPart?.referenceId || conv.customerId || '',
    email: resolveParticipantEmail(customerPart) || conv.customerEmail || null,
    name: customerPart?.displayName || conv.customerName || 'Bạn',
    roleLabel: 'Khách hàng',
    avatarUrl: customerPart?.avatarUrl || null,
    initials: getInitials(customerPart?.displayName || conv.customerName || 'Bạn'),
    online: true,
  };

  const assistant: CustomerChatParticipant = {
    id: botPart?.referenceId || 'zentech-ai',
    email: resolveParticipantEmail(botPart),
    name: botPart?.displayName || 'ZenTech AI',
    roleLabel: 'Trợ lý AI',
    avatarUrl: null,
    initials: 'AI',
    online: true,
  };

  const staff: CustomerChatParticipant | null = staffPart
    ? {
        id: staffPart.referenceId,
        email: resolveParticipantEmail(staffPart),
        name: staffPart.displayName || 'Nhân viên hỗ trợ',
        roleLabel: 'Tư vấn viên',
        avatarUrl: staffPart.avatarUrl || null,
        initials: getInitials(staffPart.displayName || 'Nhân viên hỗ trợ'),
        online: true,
      }
    : null;

  const mappedMessages: CustomerChatMessage[] = messages.map((m) => {
    const senderPart = participants.find((p) => p.referenceId === m.senderReferenceId);
    let senderName = senderPart?.displayName || 'Người dùng';
    let sender: CustomerChatMessageSender = 'CUSTOMER';

    if (m.senderType === ParticipantType.BOT) {
      sender = 'AI';
      senderName = 'ZenTech AI';
    } else if (m.senderType === ParticipantType.CUSTOMER) {
      sender = 'CUSTOMER';
      senderName = m.senderReferenceId === currentUserAccountId ? 'Bạn' : senderName;
    } else {
      sender = 'STAFF';
    }

    return {
      id: m.id,
      sender,
      senderName,
      messageType: m.messageType,
      body: m.content || '',
      callData: m.messageType === ChatMessageType.CALL && m.content ? (() => { try { return JSON.parse(m.content); } catch { return undefined; } })() : undefined,
      sentAtLabel: formatTime(m.createdAt),
      attachments: (m.attachments || []).map((att) => ({
        id: att.id,
        type: att.attachmentType as unknown as CustomerChatSharedItemType,
        title: att.fileName,
        url: att.mediaUrl || '',
        thumbnailUrl: att.attachmentType === ChatAttachmentType.IMAGE ? att.mediaUrl || null : null,
      })),
    };
  });

  const sharedItems: CustomerChatSharedItem[] = [];
  messages.forEach((m) => {
    (m.attachments || []).forEach((att) => {
      sharedItems.push({
        id: att.id,
        type: att.attachmentType as unknown as CustomerChatSharedItemType,
        title: att.fileName,
        subtitle: `${formatBytes(att.fileSize)} - ${formatTime(m.createdAt)}`,
        url: att.mediaUrl || '',
        thumbnailUrl: att.attachmentType === ChatAttachmentType.IMAGE ? att.mediaUrl || null : null,
      });
    });
  });

  return {
    id: conv.id,
    status: conv.status as unknown as CustomerChatSessionStatus,
    customer,
    assistant,
    staff,
    product: {
      id: 'default-product',
      name: 'ZenTech Support',
      imageUrl: '/home/asset-5.webp',
      priceLabel: 'Hỗ trợ',
      stockLabel: 'Trung tâm hỗ trợ khách hàng',
    },
    messages: mappedMessages,
    sharedItems,
    lastActivityLabel: conv.updatedAt ? formatTime(conv.updatedAt) : 'Vừa xong',
  };
}
