import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponse,
  ConversationResponse,
  ChatMessageResponse,
  ConversationStatus,
  PageResponse,
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
      expertRequestStatus: conv.status === ConversationStatus.WAITING_FOR_AGENT ? 'WAITING' : null,
      lastMessagePreview: conv.title || 'Hội thoại mới',
      lastMessageAtLabel: conv.updatedAt ? formatTime(conv.updatedAt) : 'Vừa xong',
      unreadCount: 0,
      productContext: 'Hỗ trợ khách hàng',
    };
  }
}
