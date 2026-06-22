import { Routes } from '@angular/router';
import { managementGuard } from '../../core/guards/management.guard';

export const managementRoutes: Routes = [
  {
    path: '',
    canActivate: [managementGuard],
    loadComponent: () =>
      import('./pages/management-layout/management-layout.component').then(m => m.ManagementLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: {
          eyebrow: 'Tổng quan hệ thống',
          title: 'Bảng điều khiển',
          description: 'Theo dõi hiệu suất kinh doanh, đơn hàng và tín hiệu vận hành theo thời gian thực.',
          primaryAction: 'Hành động mới',
        },
        loadComponent: () =>
          import('./dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'analytics',
        data: {
          eyebrow: 'Tổng quan hệ thống',
          title: 'Phân tích tác động kinh doanh',
          description: 'Giám sát thiệt hại kinh doanh, số lượng đơn hàng thất thoát và người dùng bị ảnh hưởng do sự cố kỹ thuật.',
        },
        loadComponent: () =>
          import('./business-impact/pages/management-business-impact/management-business-impact.component').then(
            m => m.ManagementBusinessImpactComponent
          ),
      },
      {
        path: 'employees',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Nhân viên',
          description: 'Quản lý đội ngũ, phân quyền và hiệu suất xử lý đơn hàng.',
          primaryAction: 'Thêm nhân viên',
        },
        loadComponent: () =>
          import('./employees/pages/management-employees-page/management-employees-page.component').then(
            m => m.ManagementEmployeesPageComponent
          ),
      },
      {
        path: 'attendance-report',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Báo cáo chấm công',
          description: 'Theo dõi thống kê và chi tiết lịch sử chấm công.',
          primaryAction: 'Lọc dữ liệu',
        },
        loadComponent: () =>
          import('./employees/pages/attendance-report/attendance-report-page.component').then(
            m => m.AttendanceReportPageComponent
          ),
      },
      {
        path: 'work-schedules',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Lịch làm việc',
          description: 'Phân ca theo tuần, gán lịch hàng loạt và quản lý giờ ca làm việc.',
          primaryAction: 'Gán ca',
        },
        loadComponent: () =>
          import('./work-schedules/pages/work-schedules-page/work-schedules-page.component').then(
            m => m.WorkSchedulesPageComponent
          ),
      },
      {
        path: 'requests',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Yêu cầu & Đề xuất',
          description: 'Gửi yêu cầu nghỉ phép, đổi ca, và điều chỉnh giờ công.',
        },
        loadComponent: () =>
          import('./pages/requests/requests.component').then(
            m => m.RequestsComponent
          ),
      },
      {
        path: 'approvals',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Duyệt yêu cầu',
          description: 'Phê duyệt các yêu cầu nghỉ phép, đổi ca, và chỉnh công từ nhân viên.',
        },
        loadComponent: () =>
          import('./pages/approvals/approvals.component').then(
            m => m.ApprovalsComponent
          ),
      },
      {
        path: 'chat',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Tư vấn khách hàng',
          description: 'Theo dõi tư vấn khách hàng, tiếp nhận từ AI và xử lý trực tiếp.',
          primaryAction: 'Tư vấn mới',
          hidePageHeader: true,
        },
        loadComponent: () =>
          import('./chat/pages/management-chat-page/management-chat-page.component').then(
            m => m.ManagementChatPageComponent
          ),
      },      {
        path: 'tickets',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Ticket hỗ trợ',
          description: 'Theo dõi trạng thái ticket phát sinh từ sự cố để tư vấn khách hàng chính xác.',
        },
        loadComponent: () =>
          import('./tickets/pages/management-tickets-page/management-tickets-page.component').then(
            m => m.ManagementTicketsPageComponent
          ),
      },
      {
        path: 'orders',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Đơn hàng',
          description: 'Theo dõi vòng đời đơn hàng, thanh toán và trạng thái giao nhận.',
          primaryAction: 'Xuất báo cáo',
        },
        loadComponent: () =>
          import('./orders/pages/management-orders-page/management-orders-page.component').then(
            m => m.ManagementOrdersPageComponent
          ),
      },
      {
        path: 'products',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Sản phẩm',
          description: 'Quản lý danh mục, biến thể, giá bán và hiển thị sản phẩm.',
          primaryAction: 'Thêm sản phẩm',
        },
        loadComponent: () =>
          import('./products/pages/management-products-page/management-products-page.component').then(
            m => m.ManagementProductsPageComponent
          ),
      },
      {
        path: 'product-groups',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Nhóm sản phẩm',
          description: 'Phân loại và quản lý nhóm sản phẩm đang hiển thị trong cửa hàng.',
          primaryAction: 'Thêm nhóm mới',
        },
        loadComponent: () =>
          import(
            './products/pages/management-product-groups-page/management-product-groups-page.component'
          ).then(
            m => m.ManagementProductGroupsPageComponent
          ),
      },
      {
        path: 'inventory',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Kho hàng',
          description: 'Giám sát tồn kho, cảnh báo thiếu hàng và luồng nhập xuất.',
          primaryAction: 'Cập nhật kho',
        },
        loadComponent: () =>
          import('./inventory/pages/management-inventory-page/management-inventory-page.component').then(
            m => m.ManagementInventoryPageComponent
          ),
      },
      {
        path: 'customers',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Khách hàng',
          description: 'Quản lý hồ sơ khách hàng, phân khúc và lịch sử tương tác.',
          primaryAction: 'Thêm khách hàng',
        },
        loadComponent: () =>
          import('./customers/pages/customer-list/customer-list.component').then(
            m => m.CustomerListComponent
          ),
      },
      {
        path: 'marketing',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Marketing',
          description: 'Lập chiến dịch, mã ưu đãi và theo dõi hiệu quả chuyển đổi.',
          primaryAction: 'Tạo chiến dịch',
        },
        loadComponent: () =>
          import('./marketing/pages/marketing-page/marketing-page.component').then(
            m => m.MarketingPageComponent
          ),
      },
      {
        path: 'ai-management',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Quản lý AI',
          description: 'Điều phối gợi ý AI, cảnh báo vận hành và tự động hóa bán hàng.',
          primaryAction: 'Thiết lập AI',
        },
        loadComponent: () =>
          import('./ai-management/pages/ai-management-page/ai-management-page.component').then(
            m => m.AiManagementPageComponent
          ),
      },
      {
        path: 'reports',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Báo cáo & Thống kê',
          description: 'Xuất báo cáo và kiểm tra chỉ số vận hành theo từng kỳ.',
          primaryAction: 'Xuất báo cáo',
        },
        loadComponent: () =>
          import('./reports/pages/management-reports/management-reports.component').then(
            m => m.ManagementReportsPageComponent
          ),
      },
      {
        path: 'pay-periods',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Quản lý Kỳ công',
          description: 'Quản lý khóa và mở khóa các kỳ tính công hàng tháng.',
        },
        loadComponent: () =>
          import('./pages/pay-periods/pay-periods.component').then(
            m => m.PayPeriodsComponent
          ),
      },
      {
        path: 'profile',
        data: {
          eyebrow: 'Tài khoản',
          title: 'Hồ sơ cá nhân',
          description: 'Quản lý thông tin cá nhân và chi tiết tài khoản của bạn.',
        },
        loadComponent: () =>
          import('./pages/management-profile-page/management-profile-page').then(
            m => m.ManagementProfilePage
          ),
      },
      {
        path: 'change-password',
        data: {
          eyebrow: 'Tài khoản',
          title: 'Đổi mật khẩu',
          description: 'Cập nhật mật khẩu mới để bảo mật tài khoản của bạn.',
        },
        loadComponent: () =>
          import('./pages/management-change-password-page/management-change-password-page').then(
            m => m.ManagementChangePasswordPage
          ),
      },
      {
        path: 'settings',
        data: {
          eyebrow: 'Tài khoản',
          title: 'Cài đặt hệ thống',
          description: 'Cấu hình các cài đặt hệ thống và tùy chọn hiển thị.',
        },
        loadComponent: () =>
          import('./pages/management-settings-page/management-settings-page').then(
            m => m.ManagementSettingsPage
          ),
      },
    ],
  },
];

