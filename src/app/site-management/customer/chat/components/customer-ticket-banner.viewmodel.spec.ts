import { describe, expect, it } from 'vitest';
import { CustomerTicketStatus } from '@/site-management/shared/chat/data-access/models/customer-chat.models';
import { toCustomerTicketBanner } from '@/site-management/customer/chat/components/customer-ticket-banner.viewmodel';

describe('toCustomerTicketBanner', () => {
  it('returns null when no ticket status is available', () => {
    expect(toCustomerTicketBanner(null)).toBeNull();
    expect(toCustomerTicketBanner(undefined)).toBeNull();
  });

  it.each(['RESOLVED', 'CLOSED'] as const)(
    'maps %s tickets to the resolved presentation',
    (status) => {
      const banner = toCustomerTicketBanner(createTicket({ status, message: '' }));

      expect(banner).toMatchObject({
        ticketStatus: status,
        tone: 'resolved',
        title: 'Sự cố đã được khắc phục',
        message: 'Bạn có thể thử lại. Nếu vẫn chưa ổn, hãy nhắn nhân viên hỗ trợ.',
      });
    },
  );

  it('maps incident codes to the incident presentation', () => {
    const banner = toCustomerTicketBanner(
      createTicket({ ticketCode: 'INC-123', status: 'IN_PROGRESS' }),
    );

    expect(banner).toMatchObject({
      ticketCode: 'INC-123',
      ticketStatus: 'IN_PROGRESS',
      tone: 'incident',
      title: 'Phát hiện sự cố hệ thống',
    });
  });

  it.each([undefined, 'TCK-456'])(
    'maps a regular ticket with code %s to the ticket presentation',
    (ticketCode) => {
      const banner = toCustomerTicketBanner(createTicket({ ticketCode }));

      expect(banner).toMatchObject({
        ticketCode: ticketCode ?? '',
        tone: 'ticket',
        title: 'Đội kỹ thuật đang khắc phục',
      });
    },
  );

  it('provides the active-ticket fallback message', () => {
    const banner = toCustomerTicketBanner(createTicket({ message: '' }));

    expect(banner?.message).toBe('Tụi mình đang kiểm tra và sẽ cập nhật khi có kết quả.');
  });

  it('converts technical payment messages and removes incident prefixes', () => {
    const banner = toCustomerTicketBanner(
      createTicket({
        ticketCode: 'INC-789',
        message: 'Khắc phục lỗi INC-789: Cannot create MoMo payment. Cannot checkout.',
      }),
    );

    expect(banner?.message).toBe(
      'Không thể khởi tạo thanh toán qua ví MoMo. Lỗi tiến trình đặt hàng & thanh toán (Checkout).',
    );
  });
});

function createTicket(overrides: Partial<CustomerTicketStatus> = {}): CustomerTicketStatus {
  return {
    ticketCode: 'TCK-123',
    status: 'OPEN',
    message: 'Đang xử lý',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}
