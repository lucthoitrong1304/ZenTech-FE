import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStorageService } from '../services/auth-storage.service';
import { SKIP_AUTH_TOKEN } from '../tokens/api-context.token';
// Import environment nếu bạn có config sẵn (tùy chọn)
// import { environment } from '../../environments/environment';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authStorageService = inject(AuthStorageService);
  const skipAuth = req.context.get(SKIP_AUTH_TOKEN);

  // 1. Chặn do cấu hình chủ động (khi gọi API login/register không cần token)
  if (skipAuth) {
    return next(req);
  }

  // 2. [QUAN TRỌNG] Ngăn chặn Rò rỉ Token
  // Chỉ đính kèm Token khi gọi tới API của dự án mình (đổi URL cho phù hợp với backend của bạn nhé)
  const isMyApi = req.url.startsWith('/api') || req.url.includes('localhost') /* || req.url.startsWith(environment.apiUrl) */;

  if (!isMyApi) {
    return next(req); // Bỏ qua, không nhét token vào request ra bên ngoài
  }

  const accessToken = authStorageService.getAccessToken();

  // 3. Clone request và nhét token vào nếu tồn tại
  if (accessToken) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return next(authReq);
  }

  // Fallback nếu không có token
  return next(req);
};
