import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import {
  ApiResponse,
  ChatAttachmentType,
  ChatMessageResponse,
  ConversationResponse,
  PageResponse,
  UploadPresignResponse,
} from '../models/customer-chat.models';

@Injectable({
  providedIn: 'root',
})
export class CustomerChatService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/chat/conversations`;

  createOrGetConversation(): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(this.baseUrl, {})
      .pipe(map((res) => res.data));
  }

  createNewConversation(): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(`${this.baseUrl}/new`, {})
      .pipe(map((res) => res.data));
  }

  getMyConversations(page = 0, size = 10): Observable<PageResponse<ConversationResponse>> {
    return this.apiService
      .get<ApiResponse<PageResponse<ConversationResponse>>>(`${this.baseUrl}/me`, {
        params: { page, size },
      })
      .pipe(map((res) => res.data));
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

  requestAgent(conversationId: string): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(
        `${this.baseUrl}/${conversationId}/request-agent`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  closeConversation(conversationId: string): Observable<ConversationResponse> {
    return this.apiService
      .post<unknown, ApiResponse<ConversationResponse>>(
        `${this.baseUrl}/${conversationId}/close`,
        {}
      )
      .pipe(map((res) => res.data));
  }

  // Quy trình upload file qua presigned URL:
  // 1. Lấy url presigned từ backend
  // 2. PUT file trực tiếp lên R2/S3
  // 3. Trả về thông tin fileKey để lưu trữ khi gửi tin nhắn qua websocket
  uploadFile(file: File): Observable<{
    fileKey: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    attachmentType: ChatAttachmentType;
  }> {
    const presignUrl = `${environment.apiBaseUrl}/uploads/presign`;
    const purpose = 'CHAT_ATTACHMENT';
    const attachmentType = this.getAttachmentType(file.type);

    return this.apiService
      .post<unknown, ApiResponse<UploadPresignResponse>>(presignUrl, {
        originalFilename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        purpose,
      })
      .pipe(
        map((res) => res.data),
        switchMap((presignRes) => {
          return this.apiService
            .putFile(presignRes.presignedUrl, file, {
              headers: presignRes.requiredHeaders || {},
            })
            .pipe(
              map(() => ({
                fileKey: presignRes.fileKey,
                fileName: file.name,
                contentType: file.type || 'application/octet-stream',
                fileSize: file.size,
                attachmentType,
              }))
            );
        })
      );
  }

  private getAttachmentType(mimeType: string): ChatAttachmentType {
    if (!mimeType) return ChatAttachmentType.FILE;
    if (mimeType.startsWith('image/')) {
      return ChatAttachmentType.IMAGE;
    }
    if (mimeType.startsWith('video/')) {
      return ChatAttachmentType.VIDEO;
    }
    return ChatAttachmentType.FILE;
  }
}
