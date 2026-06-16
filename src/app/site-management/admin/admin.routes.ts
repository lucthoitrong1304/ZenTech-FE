import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: {
          eyebrow: 'Tổng quan hệ thống',
          title: 'Bảng điều khiển',
          description: 'Giám sát sức khỏe hệ thống, tài nguyên và thống kê tổng quan theo thời gian thực.'
        },
        loadComponent: () =>
          import('./dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'logs',
        data: {
          eyebrow: 'Giám sát hệ thống',
          title: 'Nhật ký hệ thống (Logs)',
          description: 'Theo dõi, tìm kiếm và phân tích các log hoạt động của server và database.'
        },
        loadComponent: () =>
          import('./logs/pages/logs/logs.component').then(m => m.LogsComponent)
      },
      {
        path: 'incidents',
        data: {
          eyebrow: 'Giám sát hệ thống',
          title: 'Quản lý sự cố',
          description: 'Kiểm tra và xử lý các sự cố kỹ thuật của hệ thống và API.'
        },
        loadComponent: () =>
          import('./incidents/pages/incidents/incidents.component').then(m => m.IncidentsComponent)
      },
      {
        path: 'incidents/:id',
        data: {
          eyebrow: 'Giám sát hệ thống',
          title: 'Chi tiết Sự cố',
          description: 'Xem chi tiết lỗi, logs liên quan từ Loki, timeline hoạt động của user và phân tích AI.'
        },
        loadComponent: () =>
          import('./incidents/pages/incident-detail/incident-detail.component').then(m => m.IncidentDetailComponent)
      },
      {
        path: 'tickets',
        data: {
          eyebrow: 'Giám sát hệ thống',
          title: 'Hỗ trợ khách hàng (Ticket)',
          description: 'Tiếp nhận, phản hồi và xử lý các ticket yêu cầu hỗ trợ từ người dùng.'
        },
        loadComponent: () =>
          import('./tickets/pages/tickets/tickets.component').then(m => m.TicketsComponent)
      },
      {
        path: 'statistics',
        data: {
          eyebrow: 'Thống kê hệ thống',
          title: 'Biểu đồ & Phân tích lỗi',
          description: 'Báo cáo trực quan tình trạng lỗi, API gặp lỗi nhiều nhất và hành động người dùng.'
        },
        loadComponent: () =>
          import('./statistics/pages/statistics/statistics.component').then(m => m.StatisticsComponent)
      },
      {
        path: 'accounts',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Quản lý tài khoản',
          description: 'Danh sách và trạng thái hoạt động của toàn bộ tài khoản người dùng và nhân viên.'
        },
        loadComponent: () =>
          import('./accounts/pages/accounts/accounts.component').then(m => m.AccountsComponent)
      },
      {
        path: 'permissions',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Phân quyền hệ thống',
          description: 'Thiết lập ma trận quyền hạn cho các vai trò ADMIN, OWNER, MANAGER, EMPLOYEE, CUSTOMER.'
        },
        loadComponent: () =>
          import('./permissions/pages/permissions/permissions.component').then(m => m.PermissionsComponent)
      },
      {
        path: 'activity-logs',
        data: {
          eyebrow: 'Quản trị hệ thống',
          title: 'Nhật ký hoạt động',
          description: 'Audit log chi tiết ghi lại toàn bộ hành động chỉnh sửa của nhân viên và quản trị viên.'
        },
        loadComponent: () =>
          import('./activity-logs/pages/activity-logs/activity-logs.component').then(m => m.ActivityLogsComponent)
      },
      {
        path: 'profile',
        data: {
          eyebrow: 'Tài khoản Admin',
          title: 'Hồ sơ cá nhân',
          description: 'Cập nhật thông tin cá nhân và ảnh đại diện của tài khoản quản trị.'
        },
        loadComponent: () =>
          import('./pages/admin-profile/admin-profile.component').then(
            m => m.AdminProfileComponent
          )
      },
      {
        path: 'change-password',
        data: {
          eyebrow: 'Tài khoản Admin',
          title: 'Đổi mật khẩu',
          description: 'Cập nhật mật khẩu mới để tăng cường bảo mật tài khoản quản trị.'
        },
        loadComponent: () =>
          import('./pages/admin-change-password/admin-change-password.component').then(
            m => m.AdminChangePasswordComponent
          )
      }
    ]
  }
];
