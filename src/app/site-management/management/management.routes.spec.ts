import { managementRoutes } from './management.routes';
import { permissionGuard } from '../../core/guards/permission.guard';
import { PermissionCode } from '../../core/permissions/permission.models';

describe('managementRoutes', () => {
  it('registers the category management page inside the management shell', () => {
    const shellRoute = managementRoutes.find(route => route.path === '');
    const categoryRoute = shellRoute?.children?.find(route => route.path === 'categories');

    expect(categoryRoute).toBeTruthy();
    expect(categoryRoute?.data?.['title']).toBe('Danh mục sản phẩm');
    expect(categoryRoute?.data?.['permission']).toBe(PermissionCode.PRODUCT_VIEW);
    expect(categoryRoute?.canActivate).toContain(permissionGuard);
  });
});
