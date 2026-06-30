import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { AuthStorageService } from '../../../../../core/services/auth-storage.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponse,
  ConversationResponse,
  ChatMessageResponse,
  ConversationStatus,
  PageResponse,
  ParticipantStatus,
  ParticipantType,
  getInitials,
  formatTime,
  resolveParticipantEmail,
} from '../../../../customer-chat/data-access/models/customer-chat.models';
import {
  ManagementChatConversation,
  ManagementChatConversationStatus,
  ManagementChatCustomer,
  ManagementChatWorkspace,
  ChatStaffResponse
} from '../models/management-chat.models';

@Injectable({
  providedIn: 'root',
})
export class ManagementChatService {
  private readonly apiService = inject(ApiService);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/chat/conversations`;

  getWorkspace(page = 0, size = 100): Observable<ManagementChatWorkspace> {
    return this.apiService
      .get<ApiResponse<PageResponse<ConversationResponse>>>(this.baseUrl, {
        params: { page, size },
      })
      .pipe(
        map((res) => {
          const conversations = (res.data?.content || []).map((conv) =>
            this.mapToManagementChatConversation(conv)
          );
          return {
            conversations,
            messages: [],
            mediaItems: [],
          };
        })
      );
  }

  getMessages(
    conversationId: string,
    page = 0,
    size = 50
  ): Observable<PageResponse<ChatMessageResponse>> {
    return this.apiService
      .get<ApiResponse<PageResponse<ChatMessageResponse>>>(
        `${this.baseUrl}/${conversationId}/messages`,
        {
          params: { page, size },
        }
      )
      .pipe(map((res) => res.data));
  }

  claimConversation(conversationId: string): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(`${this.baseUrl}/${conversationId}/claim`, {})
      .pipe(map((res) => res.data));
  }

  joinSilent(conversationId: string): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(`${this.baseUrl}/${conversationId}/participants/silent`, {})
      .pipe(map((res) => res.data));
  }

  leaveConversation(conversationId: string): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(`${this.baseUrl}/${conversationId}/leave`, {})
      .pipe(map((res) => res.data));
  }

  getActiveStaffList(): Observable<ChatStaffResponse[]> {
    return this.apiService
      .get<ApiResponse<ChatStaffResponse[]>>(`${environment.apiBaseUrl}/management/chat/staffs/active`)
      .pipe(map((res) => res.data));
  }

  transferConversation(conversationId: string, toAccountId: string | null): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(`${this.baseUrl}/${conversationId}/transfer`, {
        targetAccountId: toAccountId
      })
      .pipe(map((res) => res.data));
  }

  public mapToManagementChatConversation(conv: ConversationResponse): ManagementChatConversation {
    const participants = conv.participants || [];
    const customerParticipant = participants.find((p) => p.userType === ParticipantType.CUSTOMER);
    const currentEmail = this.authStorageService.getSession()?.email?.trim().toLowerCase() || null;
    const currentStaffActive = !!currentEmail && participants.some((p) => {
      const participantEmail = resolveParticipantEmail(p)?.trim().toLowerCase();
      const isStaff = p.userType === ParticipantType.EMPLOYEE || p.userType === ParticipantType.EXPERT;
      return isStaff && p.status === ParticipantStatus.ACTIVE && participantEmail === currentEmail;
    });

    const customer: ManagementChatCustomer = {
      id: customerParticipant?.referenceId || conv.customerId || '',
      email: resolveParticipantEmail(customerParticipant) || conv.customerEmail || null,
      fullName: customerParticipant?.displayName || conv.customerName || 'Khách hàng',
      avatarUrl: customerParticipant?.avatarUrl || null,
      initials: getInitials(customerParticipant?.displayName || conv.customerName || 'Khách hàng'),
      online: true,
    };

    let status: ManagementChatConversationStatus = 'CLOSED';
    switch (conv.status) {
      case ConversationStatus.BOT_CONSULTING:
        status = 'AI_ASSISTING';
        break;
      case ConversationStatus.WAITING_FOR_AGENT:
        status = 'WAITING_STAFF';
        break;
      case ConversationStatus.AGENT_HANDLING:
        status = 'STAFF_HANDLING';
        break;
      case ConversationStatus.CLOSED:
        status = 'CLOSED';
        break;
    }

    return {
      id: conv.id,
      customer,
      status,
      currentStaffActive,
      expertRequestStatus: conv.status === ConversationStatus.WAITING_FOR_AGENT ? 'WAITING' : null,
      lastMessagePreview: conv.title || 'Hội thoại mới',
      lastMessageAtLabel: conv.updatedAt ? formatTime(conv.updatedAt) : 'Vừa xong',
      unreadCount: 0,
      productContext: 'Hỗ trợ khách hàng',
    };
  }
}
