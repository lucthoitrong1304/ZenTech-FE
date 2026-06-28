import { Injectable, signal, inject } from '@angular/core';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { CommandPaletteGroup, ApiResponseDto, GlobalSearchResponse } from '../models/command-palette.models';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../core/permissions/permission.models';

export type { CommandPaletteItem, CommandPaletteGroup } from '../models/command-palette.models';

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  private readonly apiService = inject(ApiService);
  private readonly permissionService = inject(PermissionService);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly _isOpen = signal<boolean>(false);
  private readonly _searchQuery = signal<string>('');
  private readonly _isLoading = signal<boolean>(false);
  private readonly _results = signal<CommandPaletteGroup[]>([]);

  readonly isOpen = this._isOpen.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly results = this._results.asReadonly();

  private readonly search$ = new Subject<string>();

  // Mặc định hiển thị các navigation cơ bản khi chưa có query
  private readonly defaultNavigation: CommandPaletteGroup = {
    id: 'navigation',
    title: 'Điều hướng nhanh',
    items: [
      { id: 'nav-dashboard', icon: 'LayoutDashboard', label: 'Bảng điều khiển', path: '/management/dashboard' },
      { id: 'nav-orders', icon: 'ShoppingBag', label: 'Quản lý đơn hàng', path: '/management/orders', permission: PermissionCode.ORDER_VIEW },
      { id: 'nav-products', icon: 'Package', label: 'Quản lý sản phẩm', path: '/management/products', permission: PermissionCode.PRODUCT_VIEW },
      { id: 'nav-customers', icon: 'Users', label: 'Khách hàng', path: '/management/customers', permission: PermissionCode.CUSTOMER_VIEW },
      { id: 'nav-chat', icon: 'MessageCircle', label: 'Hỗ trợ khách hàng', path: '/management/chat', permission: PermissionCode.CHAT_VIEW }
    ]
  };

  constructor() {
    // Khởi tạo data mặc định
    this._results.set([this.getDefaultNavigation()]);
    this.permissionService.ensureLoaded().subscribe(() => this._results.set([this.getDefaultNavigation()]));

    // Đăng ký luồng tìm kiếm tối ưu bằng RxJS
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this._results.set([this.getDefaultNavigation()]);
    this.permissionService.ensureLoaded().subscribe(() => this._results.set([this.getDefaultNavigation()]));
          this._isLoading.set(false);
          return of(null);
        }

        const canSearchManagement = this.permissionService.has(PermissionCode.PRODUCT_VIEW)
          || this.permissionService.has(PermissionCode.ORDER_VIEW)
          || this.permissionService.has(PermissionCode.CUSTOMER_VIEW);
        if (!canSearchManagement) {
          this._isLoading.set(false);
          return of(null);
        }

        this._isLoading.set(true);
        return this.apiService.get<ApiResponseDto<GlobalSearchResponse>>(
          `${this.baseUrl}/management/search`,
          { params: { keyword: query } }
        ).pipe(
          catchError(err => {
            console.error('Lỗi tìm kiếm:', err);
            this._isLoading.set(false);
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      if (!response) {
        this._isLoading.set(false);
        return;
      }

      const data = response.data;
      const newResults: CommandPaletteGroup[] = [];

      // Lọc navigation hiện tại dựa trên query của user
      const lowerQuery = this._searchQuery().toLowerCase();
      const filteredNav = this.getDefaultNavigation().items.filter(item =>
        item.label.toLowerCase().includes(lowerQuery)
      );

      if (filteredNav.length > 0) {
        newResults.push({
          id: 'navigation',
          title: 'Điều hướng',
          items: filteredNav
        });
      }

      // Nhóm sản phẩm từ API
      if (this.permissionService.has(PermissionCode.PRODUCT_VIEW) && data.products && data.products.length > 0) {
        newResults.push({
          id: 'products',
          title: 'Sản phẩm',
          items: data.products.map(p => ({
            id: p.id,
            icon: 'Package',
            label: p.label,
            description: p.description,
            path: p.path
          }))
        });
      }

      // Nhóm đơn hàng từ API
      if (this.permissionService.has(PermissionCode.ORDER_VIEW) && data.orders && data.orders.length > 0) {
        newResults.push({
          id: 'orders',
          title: 'Đơn hàng',
          items: data.orders.map(o => ({
            id: o.id,
            icon: 'ShoppingBag',
            label: o.label,
            description: o.description,
            path: o.path
          }))
        });
      }

      // Nhóm khách hàng từ API
      if (this.permissionService.has(PermissionCode.CUSTOMER_VIEW) && data.customers && data.customers.length > 0) {
        newResults.push({
          id: 'customers',
          title: 'Khách hàng',
          items: data.customers.map(c => ({
            id: c.id,
            icon: 'Users',
            label: c.label,
            description: c.description,
            path: c.path
          }))
        });
      }

      this._results.set(newResults);
      this._isLoading.set(false);
    });
  }


  private getDefaultNavigation(): CommandPaletteGroup {
    return {
      ...this.defaultNavigation,
      items: this.defaultNavigation.items.filter(item =>
        !item.permission || this.permissionService.has(item.permission)
      ),
    };
  }
  open(): void {
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this.setSearchQuery(''); // Reset query when closing
  }

  toggle(): void {
    this._isOpen.update(v => !v);
    if (!this._isOpen()) {
      this.setSearchQuery('');
    }
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
    this.search$.next(query);
  }
}
