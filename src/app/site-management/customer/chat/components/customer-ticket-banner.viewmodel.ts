import { CustomerTicketStatus } from '@/site-management/shared/chat/data-access/models/customer-chat.models';

export interface CustomerTicketBannerViewModel {
  ticketCode: string;
  ticketStatus: CustomerTicketStatus['status'];
  tone: 'resolved' | 'incident' | 'ticket';
  title: string;
  message: string;
}

export function toCustomerTicketBanner(
  ticket: CustomerTicketStatus | null | undefined,
): CustomerTicketBannerViewModel | null {
  if (!ticket) return null;

  const resolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const incident = ticket.ticketCode?.startsWith('INC-') ?? false;
  return {
    ticketCode: ticket.ticketCode ?? '',
    ticketStatus: ticket.status,
    tone: resolved ? 'resolved' : incident ? 'incident' : 'ticket',
    title: resolved
      ? 'Sự cố đã được khắc phục'
      : incident
        ? 'Phát hiện sự cố hệ thống'
        : 'Đội kỹ thuật đang khắc phục',
    message: toFriendlyMessage(ticket.message, resolved),
  };
}

function toFriendlyMessage(message: string | null | undefined, resolved: boolean): string {
  if (!message) {
    return resolved
      ? 'Bạn có thể thử lại. Nếu vẫn chưa ổn, hãy nhắn nhân viên hỗ trợ.'
      : 'Tụi mình đang kiểm tra và sẽ cập nhật khi có kết quả.';
  }

  return message
    .replace(/Cannot create MoMo payment/gi, 'Không thể khởi tạo thanh toán qua ví MoMo')
    .replace(/Cannot checkout/gi, 'Lỗi tiến trình đặt hàng & thanh toán (Checkout)')
    .replace(/(?:Sửa lỗi sự cố|Khắc phục lỗi)\s+INC-\d+:\s*/gi, '');
}
