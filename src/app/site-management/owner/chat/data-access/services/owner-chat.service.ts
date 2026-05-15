import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OwnerChatWorkspace } from '../models/owner-chat.models';

const CUSTOMER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBCI2TQqDmto3RJqsJL7pZbP_c3ZEzD1O0B1SFZxKBZs_-lZhjyCBTkvUdVKyUm_kNq3dPcZQMWbcKH39bBdEzlL4nUH2XMm4HkmvjlMMwYFYTf5xlux3zhCv7UrdpASKAt_nluQlgtQhqQTDog64g8Uwf3ccodt3mLfzhtuytTi3xeipSSVv9uqyo1Gdc5t4uYNI5Lfha2S8agEkfW6hEAlWwwhk83rNb-uFSNXz8qEGCy6TS9vtGBVP2qlaTt0NtGqQKEadurLz0';

const ALT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAIXcc-38vxyM654gpMEsISMQhx5NtCQ4g0_mcteA054uOLYZS73ei2k2erRjhHqAhSQBu4OOCCRuUAFsV9P0z9eyEdlaCkIZHVnOnCsj4ZJT-fOCoxCDElEQWg5C45Bo3XmLX-gRIV7sQO2QebbBIutx0V4l1mBgGhUbNHo39WLBhkdMm2SmLUM-qtMfQqlm5IPIXUXSnOiOsy92m7ynRtUsQ5_CwLTZ6JLet5Vkp1h7ki-TwjAt90L7AerVinsawzE6aqRdMcN1k';

const PRODUCT_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBhJ9wVl1FSuBruNV6fkj7j7FUlKINCF1YnikGU7OR0b4YG1ZXkK3xDI5bgTW3KEi7kIfqFX5Zu_bUZ69fd6Z_fpkXjnA4kS-F3nlMbBY9dqJ6TMVOHcN3dSDo0J4l4LNkOS7ZnAyc6_-3L32Q1Tu4DSc2XGksymP1KYJtVZQEIvpu0nOVGPJ0mwS04zw565zGtzlwTwEsw0vu7scdjFi5p2wFQ4xZVI7rXaWlAKvmvH_2ZQWA2RnObrqPqRYwAmr4xcwy4BIBBVGA';

const PRODUCT_IMAGE_TWO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBIjV625bFKMj3Vr_rbBM9CGbUql31B8sPIttDlf7wPPl3s7a76GMNTwxYQCSCWb4OEnDYavU5ftYvO2rzWBVYFnodpG7apeY2JTROzIyl9Nr37liH9a_y_A1N5SahOybDwXwhaI70mTzy6Bkm8CjKixJXaS2JUqrRupuiru2dKtYBSsz8HEN5BW8B_K8lCtT5XAsPi3BynKO70DPtYVH0EboL-JOv3oCC6lYX-T5lZ-Iud6j38tFO67QMYs4jKxPgme0gZ2N-Elu4';

const MOCK_WORKSPACE: OwnerChatWorkspace = {
  conversations: [
    {
      id: 'conv-nguyen-van-a',
      customer: {
        id: 'customer-a',
        fullName: 'Nguyễn Văn A',
        avatarUrl: CUSTOMER_AVATAR,
        initials: 'NA',
        online: true,
      },
      status: 'AI_ASSISTING',
      expertRequestStatus: 'WAITING',
      lastMessagePreview: 'Cho tôi hỏi về sản phẩm này với ạ, màu đen còn hàng không?',
      lastMessageAtLabel: '10:42 AM',
      unreadCount: 2,
      productContext: 'Sony WF-1000XM4',
    },
    {
      id: 'conv-tran-thi-b',
      customer: {
        id: 'customer-b',
        fullName: 'Trần Thị B',
        avatarUrl: ALT_AVATAR,
        initials: 'TB',
        online: false,
      },
      status: 'WAITING_STAFF',
      expertRequestStatus: 'ACCEPTED',
      lastMessagePreview: 'Cảm ơn shop đã tư vấn nhiệt tình, tôi sẽ đặt hàng nhé.',
      lastMessageAtLabel: 'Hôm qua',
      unreadCount: 0,
      productContext: 'Keychron K8 Pro',
    },
    {
      id: 'conv-le-van-c',
      customer: {
        id: 'customer-c',
        fullName: 'Lê Văn C',
        avatarUrl: null,
        initials: 'LC',
        online: false,
      },
      status: 'STAFF_HANDLING',
      expertRequestStatus: null,
      lastMessagePreview: 'Đơn hàng mã #1234 của tôi bao giờ giao tới nơi?',
      lastMessageAtLabel: 'T2',
      unreadCount: 0,
      productContext: 'Don hang #1234',
    },
    {
      id: 'conv-pham-minh-d',
      customer: {
        id: 'customer-d',
        fullName: 'Phạm Minh D',
        avatarUrl: null,
        initials: 'PD',
        online: true,
      },
      status: 'CLOSED',
      expertRequestStatus: 'CANCELLED',
      lastMessagePreview: 'Tôi muốn đổi trả sản phẩm bị lỗi hôm qua.',
      lastMessageAtLabel: 'T7',
      unreadCount: 0,
      productContext: 'Bảo hành phụ kiện',
    },
  ],
  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-nguyen-van-a',
      sender: 'CUSTOMER',
      senderName: 'Nguyễn Văn A',
      body: 'Chào shop, cho mình hỏi về sản phẩm tai nghe chống ồn nhé.',
      sentAtLabel: '10:30 AM',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-nguyen-van-a',
      sender: 'AI',
      senderName: 'AI Assistant',
      body: 'Chào bạn! Mình là trợ lý ảo ZenTech. Bạn đang quan tâm đến dòng tai nghe chống ồn nào ạ? Hiện tại bên mình đang có các dòng Sony, Bose và Apple.',
      sentAtLabel: '10:30 AM',
    },
    {
      id: 'msg-3',
      conversationId: 'conv-nguyen-van-a',
      sender: 'CUSTOMER',
      senderName: 'Nguyễn Văn A',
      body: 'Mình muốn xem dòng Sony WF-1000XM4.',
      sentAtLabel: '10:35 AM',
    },
    {
      id: 'msg-4',
      conversationId: 'conv-nguyen-van-a',
      sender: 'STAFF',
      senderName: 'Bạn (Nhân viên)',
      body: 'Dạ em chào anh, sản phẩm Sony WF-1000XM4 bên em đang có sẵn hàng ạ.',
      sentAtLabel: '10:40 AM',
    },
    {
      id: 'msg-5',
      conversationId: 'conv-nguyen-van-a',
      sender: 'CUSTOMER',
      senderName: 'Nguyễn Văn A',
      body: 'Cho tôi hỏi về sản phẩm này với ạ, màu đen còn hàng không?',
      sentAtLabel: '10:42 AM',
    },
  ],
  mediaItems: [
    {
      id: 'media-1',
      conversationId: 'conv-nguyen-van-a',
      type: 'IMAGE',
      title: 'Sony WF-1000XM4 mặt trước',
      subtitle: 'Ảnh sản phẩm',
      url: PRODUCT_IMAGE,
      thumbnailUrl: PRODUCT_IMAGE,
    },
    {
      id: 'media-2',
      conversationId: 'conv-nguyen-van-a',
      type: 'IMAGE',
      title: 'Sony WF-1000XM4 màu đen',
      subtitle: 'Ảnh sản phẩm',
      url: PRODUCT_IMAGE_TWO,
      thumbnailUrl: PRODUCT_IMAGE_TWO,
    },
    {
      id: 'media-3',
      conversationId: 'conv-nguyen-van-a',
      type: 'VIDEO',
      title: 'Demo chống ồn',
      subtitle: 'Video 18 giây',
      url: PRODUCT_IMAGE_TWO,
      thumbnailUrl: PRODUCT_IMAGE_TWO,
    },
    {
      id: 'file-1',
      conversationId: 'conv-nguyen-van-a',
      type: 'FILE',
      title: 'HDSD_WF-1000XM4.pdf',
      subtitle: '2.4 MB - Hôm qua',
      url: '#',
      thumbnailUrl: null,
    },
    {
      id: 'file-2',
      conversationId: 'conv-nguyen-van-a',
      type: 'FILE',
      title: 'Bao_gia_phu_kien.docx',
      subtitle: '845 KB - 12 Thg 10',
      url: '#',
      thumbnailUrl: null,
    },
    {
      id: 'link-1',
      conversationId: 'conv-nguyen-van-a',
      type: 'LINK',
      title: 'Trang sản phẩm Sony WF-1000XM4',
      subtitle: 'zentech.vn/products/sony-wf-1000xm4',
      url: '#',
      thumbnailUrl: null,
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class OwnerChatService {
  getWorkspace(): Observable<OwnerChatWorkspace> {
    return of({
      conversations: MOCK_WORKSPACE.conversations.map(conversation => ({ ...conversation })),
      messages: MOCK_WORKSPACE.messages.map(message => ({ ...message })),
      mediaItems: MOCK_WORKSPACE.mediaItems.map(mediaItem => ({ ...mediaItem })),
    });
  }
}
