import { Routes } from '@angular/router';
import { ownerGuard } from '../../core/guards/owner.guard';

export const ownerRoutes: Routes = [
  {
    path: '',
    canActivate: [ownerGuard],
    loadComponent: () =>
      import('./pages/owner-layout/owner-layout.component').then(m => m.OwnerLayoutComponent),
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
          import('./pages/owner-dashboard/owner-dashboard.component').then(
            m => m.OwnerDashboardComponent
          ),
      },
      {
        path: 'analytics',
        data: {
          eyebrow: 'Tổng quan hệ thống',
          title: 'Phân tích kinh doanh',
          description: 'Không gian tổng hợp xu hướng doanh thu, kênh bán và hiệu quả tăng trưởng.',
          primaryAction: 'Tạo phân tích',
        },
        loadComponent: () =>
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./employees/pages/owner-employees-page/owner-employees-page.component').then(
            m => m.OwnerEmployeesPageComponent
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
          import('./chat/pages/owner-chat-page/owner-chat-page.component').then(
            m => m.OwnerChatPageComponent
          ),
      },
      {
        path: 'orders',
        data: {
          eyebrow: 'Điều hành kinh doanh',
          title: 'Đơn hàng',
          description: 'Theo dõi vòng đời đơn hàng, thanh toán và trạng thái giao nhận.',
          primaryAction: 'Tạo đơn hàng',
        },
        loadComponent: () =>
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
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
          import('./pages/owner-placeholder/owner-placeholder.component').then(
            m => m.OwnerPlaceholderComponent
          ),
      },
    ],
  },
];
