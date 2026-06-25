import { managementRoutes } from './management.routes';

describe('managementRoutes', () => {
  it('registers the category management page inside the management shell', () => {
    const shellRoute = managementRoutes.find(route => route.path === '');
    const categoryRoute = shellRoute?.children?.find(route => route.path === 'categories');

    expect(categoryRoute).toBeTruthy();
    expect(categoryRoute?.data?.['title']).toBe('Danh mục sản phẩm');
  });
});
