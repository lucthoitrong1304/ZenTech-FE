import { Routes } from '@angular/router';
import { managementGuard } from '../../core/guards/management.guard';
import { PermissionCode } from '../../core/permissions/permission.models';
import { loadManagementPermissionComponent } from './management-permission-loader';

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
          permission: PermissionCode.REPORT_VIEW,
          eyebrow: 'Tổng quan hệ thống',
          title: 'Phân tích tác động kinh doanh',
          description: 'Giám sát thiệt hại kinh doanh, số lượng đơn hàng thất thoát và người dùng bị ảnh hưởng do sự cố kỹ thuật.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.REPORT_VIEW, () =>
          import('./business-impact/pages/management-business-impact/management-business-impact.component').then(
            m => m.ManagementBusinessImpactComponent
          )),
      },
      {
        path: 'employees',
        data: {
          permission: PermissionCode.EMPLOYEE_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Nhân viên',
          description: 'Quản lý đội ngũ, phân quyền và hiệu suất xử lý đơn hàng.',
          primaryAction: 'Thêm nhân viên',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.EMPLOYEE_VIEW, () =>
          import('./employees/pages/management-employees-page/management-employees-page.component').then(
            m => m.ManagementEmployeesPageComponent
          )),
      },
      {
        path: 'attendance-report',
        data: {
          permission: PermissionCode.SCHEDULE_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Báo cáo chấm công',
          description: 'Theo dõi thống kê và chi tiết lịch sử chấm công.',
          primaryAction: 'Lọc dữ liệu',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.SCHEDULE_VIEW, () =>
          import('./employees/pages/attendance-report/attendance-report-page.component').then(
            m => m.AttendanceReportPageComponent
          )),
      },
      {
        path: 'work-schedules',
        data: {
          permission: PermissionCode.SCHEDULE_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Lịch làm việc',
          description: 'Phân ca theo tuần, gán lịch hàng loạt và quản lý giờ ca làm việc.',
          primaryAction: 'Gán ca',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.SCHEDULE_VIEW, () =>
          import('./work-schedules/pages/work-schedules-page/work-schedules-page.component').then(
            m => m.WorkSchedulesPageComponent
          )),
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
          permission: PermissionCode.APPROVAL_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Duyệt yêu cầu',
          description: 'Phê duyệt các yêu cầu nghỉ phép, đổi ca, và chỉnh công từ nhân viên.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.APPROVAL_VIEW, () =>
          import('./pages/approvals/approvals.component').then(
            m => m.ApprovalsComponent
          )),
      },
      {
        path: 'chat',
        data: {
          permission: PermissionCode.CHAT_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Tư vấn khách hàng',
          description: 'Theo dõi tư vấn khách hàng, tiếp nhận từ AI và xử lý trực tiếp.',
          primaryAction: 'Tư vấn mới',
          hidePageHeader: true,
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.CHAT_VIEW, () =>
          import('./chat/pages/management-chat-page/management-chat-page.component').then(
            m => m.ManagementChatPageComponent
          )),
      },      {
        path: 'tickets',
        data: {
          permission: PermissionCode.CHAT_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Ticket hỗ trợ',
          description: 'Theo dõi trạng thái ticket phát sinh từ sự cố để tư vấn khách hàng chính xác.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.CHAT_VIEW, () =>
          import('./tickets/pages/management-tickets-page/management-tickets-page.component').then(
            m => m.ManagementTicketsPageComponent
          )),
      },
      {
        path: 'orders',
        data: {
          permission: PermissionCode.ORDER_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Đơn hàng',
          description: 'Theo dõi vòng đời đơn hàng, thanh toán và trạng thái giao nhận.',
          primaryAction: 'Xuất báo cáo',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.ORDER_VIEW, () =>
          import('./orders/pages/management-orders-page/management-orders-page.component').then(
            m => m.ManagementOrdersPageComponent
          )),
      },
      {
        path: 'return-requests',
        data: {
          permission: PermissionCode.RETURN_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Yêu cầu trả hàng',
          description: 'Xét duyệt các yêu cầu trả hàng và hoàn tiền từ khách hàng.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.RETURN_VIEW, () =>
          import('./return-requests/pages/return-requests-page/return-requests-page.component').then(
            m => m.ReturnRequestsPageComponent
          )),
      },
      {
        path: 'products',
        data: {
          permission: PermissionCode.PRODUCT_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Sản phẩm',
          description: 'Quản lý danh mục, biến thể, giá bán và hiển thị sản phẩm.',
          primaryAction: 'Thêm sản phẩm',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.PRODUCT_VIEW, () =>
          import('./products/pages/management-products-page/management-products-page.component').then(
            m => m.ManagementProductsPageComponent
          )),
      },
      {
        path: 'categories',
        data: {
          permission: PermissionCode.PRODUCT_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Danh mục sản phẩm',
          description: 'Quản lý cây danh mục, trạng thái hiển thị và thứ tự xuất hiện trên storefront.',
          primaryAction: 'Thêm danh mục',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.PRODUCT_VIEW, () =>
          import('./categories/pages/management-categories-page/management-categories-page.component').then(
            m => m.ManagementCategoriesPageComponent
          )),
      },
      {
        path: 'product-groups',
        data: {
          permission: PermissionCode.PRODUCT_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Nhóm sản phẩm',
          description: 'Phân loại và quản lý nhóm sản phẩm đang hiển thị trong cửa hàng.',
          primaryAction: 'Thêm nhóm mới',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.PRODUCT_VIEW, () =>
          import(
            './products/pages/management-product-groups-page/management-product-groups-page.component'
          ).then(
            m => m.ManagementProductGroupsPageComponent
          )),
      },
      {
        path: 'inventory',
        data: {
          permission: PermissionCode.INVENTORY_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Kho hàng',
          description: 'Giám sát tồn kho, cảnh báo thiếu hàng và luồng nhập xuất.',
          primaryAction: 'Cập nhật kho',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.INVENTORY_VIEW, () =>
          import('./inventory/pages/management-inventory-page/management-inventory-page.component').then(
            m => m.ManagementInventoryPageComponent
          )),
      },
      {
        path: 'customers',
        data: {
          permission: PermissionCode.CUSTOMER_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Khách hàng',
          description: 'Quản lý hồ sơ khách hàng, phân khúc và lịch sử tương tác.',
          primaryAction: 'Thêm khách hàng',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.CUSTOMER_VIEW, () =>
          import('./customers/pages/customer-list/customer-list.component').then(
            m => m.CustomerListComponent
          )),
      },
      {
        path: 'marketing',
        data: {
          permission: PermissionCode.MARKETING_VIEW,
          eyebrow: 'Điều hành kinh doanh',
          title: 'Marketing',
          description: 'Lập chiến dịch, mã ưu đãi và theo dõi hiệu quả chuyển đổi.',
          primaryAction: 'Tạo chiến dịch',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.MARKETING_VIEW, () =>
          import('./marketing/pages/marketing-page/marketing-page.component').then(
            m => m.MarketingPageComponent
          )),
      },
      {
        path: 'ai-management',
        data: {
          permission: PermissionCode.AI_VIEW,
          eyebrow: 'Quản trị hệ thống',
          title: 'Quản lý AI',
          description: 'Điều phối gợi ý AI, cảnh báo vận hành và tự động hóa bán hàng.',
          primaryAction: 'Thiết lập AI',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.AI_VIEW, () =>
          import('./ai-management/pages/ai-management-page/ai-management-page.component').then(
            m => m.AiManagementPageComponent
          )),
      },
      {
        path: 'reports',
        data: {
          permission: PermissionCode.REPORT_VIEW,
          eyebrow: 'Quản trị hệ thống',
          title: 'Báo cáo & Thống kê',
          description: 'Xuất báo cáo và kiểm tra chỉ số vận hành theo từng kỳ.',
          primaryAction: 'Xuất báo cáo',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.REPORT_VIEW, () =>
          import('./reports/pages/management-reports/management-reports.component').then(
            m => m.ManagementReportsPageComponent
          )),
      },
      {
        path: 'pay-periods',
        data: {
          permission: PermissionCode.PAY_PERIOD_VIEW,
          eyebrow: 'Quản trị hệ thống',
          title: 'Quản lý Kỳ công',
          description: 'Quản lý khóa và mở khóa các kỳ tính công hàng tháng.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.PAY_PERIOD_VIEW, () =>
          import('./pages/pay-periods/pay-periods.component').then(
            m => m.PayPeriodsComponent
          )),
      },
      {
        path: 'leave-settings',
        data: {
          permission: PermissionCode.EMPLOYEE_UPDATE,
          eyebrow: 'Quản trị hệ thống',
          title: 'Loại phép & hạn mức',
          description: 'Cấu hình loại yêu cầu nghỉ phép và hạn mức theo nhân viên.',
        },
        loadComponent: loadManagementPermissionComponent(PermissionCode.EMPLOYEE_UPDATE, () =>
          import('./pages/leave-settings/leave-settings.component').then(
            m => m.LeaveSettingsComponent
          )),
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

