import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponse,
  ConversationResponse,
  ConversationStatus,
  PageResponse,
  ParticipantType,
  getInitials,
  formatTime,
} from '../../../../customer-chat/data-access/models/customer-chat.models';
import {
  OwnerChatConversation,
  OwnerChatConversationStatus,
  OwnerChatCustomer,
  OwnerChatWorkspace,
} from '../models/owner-chat.models';

@Injectable({
  providedIn: 'root',
})
export class OwnerChatService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/owner/chat/conversations`;

  getWorkspace(page = 0, size = 100): Observable<OwnerChatWorkspace> {
    return this.apiService
      .get<ApiResponse<PageResponse<ConversationResponse>>>(this.baseUrl, {
        params: { page, size },
      })
      .pipe(
        map((res) => {
          const conversations = (res.data?.content || []).map((conv) =>
            this.mapToOwnerChatConversation(conv)
          );
          return {
            conversations,
            messages: [],
            mediaItems: [],
          };
        })
      );
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

  public mapToOwnerChatConversation(conv: ConversationResponse): OwnerChatConversation {
    const participants = conv.participants || [];
    const customerParticipant = participants.find((p) => p.userType === ParticipantType.CUSTOMER);

    const customer: OwnerChatCustomer = {
      id: customerParticipant?.referenceId || conv.customerId || '',
      fullName: customerParticipant?.displayName || conv.customerName || 'Khách hàng',
      avatarUrl: customerParticipant?.avatarUrl || null,
      initials: getInitials(customerParticipant?.displayName || conv.customerName || 'Khách hàng'),
      online: true,
    };

    let status: OwnerChatConversationStatus = 'CLOSED';
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
