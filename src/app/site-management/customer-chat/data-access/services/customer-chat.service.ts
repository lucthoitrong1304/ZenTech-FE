import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CustomerChatSendMessagePayload,
  CustomerChatSession,
  CustomerChatUploadResult,
} from '../models/customer-chat.models';

const CUSTOMER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBCI2TQqDmto3RJqsJL7pZbP_c3ZEzD1O0B1SFZxKBZs_-lZhjyCBTkvUdVKyUm_kNq3dPcZQMWbcKH39bBdEzlL4nUH2XMm4HkmvjlMMwYFYTf5xlux3zhCv7UrdpASKAt_nluQlgtQhqQTDog64g8Uwf3ccodt3mLfzhtuytTi3xeipSSVv9uqyo1Gdc5t4uYNI5Lfha2S8agEkfW6hEAlWwwhk83rNb-uFSNXz8qEGCy6TS9vtGBVP2qlaTt0NtGqQKEadurLz0';

const STAFF_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAIXcc-38vxyM654gpMEsISMQhx5NtCQ4g0_mcteA054uOLYZS73ei2k2erRjhHqAhSQBu4OOCCRuUAFsV9P0z9eyEdlaCkIZHVnOnCsj4ZJT-fOCoxCDElEQWg5C45Bo3XmLX-gRIV7sQO2QebbBIutx0V4l1mBgGhUbNHo39WLBhkdMm2SmLUM-qtMfQqlm5IPIXUXSnOiOsy92m7ynRtUsQ5_CwLTZ6JLet5Vkp1h7ki-TwjAt90L7AerVinsawzE6aqRdMcN1k';

const PRODUCT_IMAGE = '/home/asset-5.webp';
const PRODUCT_IMAGE_TWO = '/home/asset-7.webp';
const PRODUCT_IMAGE_THREE = '/home/asset-9.webp';

const MOCK_SESSION: CustomerChatSession = {
  id: 'customer-chat-session-1',
  status: 'STAFF_JOINED',
  customer: {
    id: 'customer-current',
    name: 'Bạn',
    roleLabel: 'Khách hàng',
    avatarUrl: CUSTOMER_AVATAR,
    initials: 'BN',
    online: true,
  },
  assistant: {
    id: 'zentech-ai',
    name: 'ZenTech AI',
    roleLabel: 'Trợ lý AI',
    avatarUrl: null,
    initials: 'AI',
    online: true,
  },
  staff: {
    id: 'staff-minh-anh',
    name: 'Minh Anh',
    roleLabel: 'Tư vấn viên',
    avatarUrl: STAFF_AVATAR,
    initials: 'MA',
    online: true,
  },
  product: {
    id: 'mercury-v60-pro',
    name: 'Mercury V60 Pro',
    imageUrl: PRODUCT_IMAGE,
    priceLabel: '$109',
    stockLabel: 'Còn hàng - giao trong 24h',
  },
  lastActivityLabel: 'Vừa xong',
  messages: [
    {
      id: 'msg-welcome',
      sender: 'AI',
      senderName: 'ZenTech AI',
      body:
        'Chào bạn, mình là trợ lý ZenTech. Mình có thể kiểm tra tồn kho, so sánh cấu hình hoặc kết nối bạn với tư vấn viên.',
      sentAtLabel: '10:30',
      attachments: [],
    },
    {
      id: 'msg-customer-need',
      sender: 'CUSTOMER',
      senderName: 'Bạn',
      body: 'Mình cần bàn phím nhỏ gọn, gõ êm và có kết nối Bluetooth.',
      sentAtLabel: '10:31',
      attachments: [],
    },
    {
      id: 'msg-ai-suggest',
      sender: 'AI',
      senderName: 'ZenTech AI',
      body:
        'Mercury V60 Pro phù hợp với nhu cầu này. Mình đã gửi thêm ảnh, thông số và trang sản phẩm để bạn xem nhanh.',
      sentAtLabel: '10:31',
      attachments: [
        {
          id: 'attachment-product',
          type: 'IMAGE',
          title: 'Mercury V60 Pro',
          url: PRODUCT_IMAGE,
          thumbnailUrl: PRODUCT_IMAGE,
        },
      ],
    },
    {
      id: 'msg-staff-joined',
      sender: 'STAFF',
      senderName: 'Minh Anh',
      body:
        'Em chào anh/chị, em là Minh Anh. Mẫu Mercury V60 Pro hiện còn bản đen và bạc, bảo hành 24 tháng.',
      sentAtLabel: '10:33',
      attachments: [],
    },
  ],
  sharedItems: [
    {
      id: 'media-1',
      type: 'IMAGE',
      title: 'Mercury V60 Pro - góc nghiêng',
      subtitle: 'Ảnh sản phẩm',
      url: PRODUCT_IMAGE,
      thumbnailUrl: PRODUCT_IMAGE,
    },
    {
      id: 'media-2',
      type: 'IMAGE',
      title: 'Mercury V60 Pro - layout',
      subtitle: 'Ảnh sản phẩm',
      url: PRODUCT_IMAGE_TWO,
      thumbnailUrl: PRODUCT_IMAGE_TWO,
    },
    {
      id: 'media-3',
      type: 'VIDEO',
      title: 'Sound test switch HE',
      subtitle: 'Video 18 giây',
      url: PRODUCT_IMAGE_THREE,
      thumbnailUrl: PRODUCT_IMAGE_THREE,
    },
    {
      id: 'file-1',
      type: 'FILE',
      title: 'Mercury_V60_Pro_specs.pdf',
      subtitle: '2.4 MB - Hôm nay',
      url: '#',
      thumbnailUrl: null,
    },
    {
      id: 'file-2',
      type: 'FILE',
      title: 'Chính_sách_bảo_hành.pdf',
      subtitle: '780 KB - Hôm qua',
      url: '#',
      thumbnailUrl: null,
    },
    {
      id: 'link-1',
      type: 'LINK',
      title: 'Trang sản phẩm Mercury V60 Pro',
      subtitle: 'zentech.vn/products/mercury-v60-pro',
      url: '/products/mercury-v60-pro',
      thumbnailUrl: null,
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class CustomerChatService {
  getSession(): Observable<CustomerChatSession> {
    return of(cloneSession(MOCK_SESSION)).pipe(delay(120));
  }

  sendCustomerMessage(payload: CustomerChatSendMessagePayload): Observable<string> {
    const response = payload.staffJoined
      ? 'Dạ em đã nhận tin nhắn. Em sẽ kiểm tra thêm lựa chọn phù hợp và phản hồi ngay trong khung chat này.'
      : 'Mình đã ghi nhận yêu cầu. Nếu cần xử lý chi tiết hơn, mình sẽ chuyển tư vấn viên vào cuộc trò chuyện.';

    return of(response).pipe(delay(260));
  }

  uploadCustomerFiles(files: File[]): Observable<CustomerChatUploadResult[]> {
    const results = files.map(file => ({
      id: `shared-upload-${Date.now()}-${file.name}`,
      title: file.name,
      subtitle: `${formatFileSize(file.size)} - Vừa tải lên`,
      url: '#',
      type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
    })) satisfies CustomerChatUploadResult[];

    return of(results).pipe(delay(420));
  }
}

function cloneSession(session: CustomerChatSession): CustomerChatSession {
  return {
    ...session,
    customer: { ...session.customer },
    assistant: { ...session.assistant },
    staff: session.staff ? { ...session.staff } : null,
    product: { ...session.product },
    messages: session.messages.map(message => ({
      ...message,
      attachments: message.attachments.map(attachment => ({ ...attachment })),
    })),
    sharedItems: session.sharedItems.map(item => ({ ...item })),
  };
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
