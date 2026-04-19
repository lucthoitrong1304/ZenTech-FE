import { HttpClient, HttpContext, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// 1. Gỡ bỏ observe và responseType ra khỏi Interface dùng chung
export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean>;
  context?: HttpContext;
  reportProgress?: boolean;
  withCredentials?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  // ==========================================
  // NHÓM 1: CÁC HÀM MẶC ĐỊNH (Luôn trả về JSON Body kiểu T)
  // ==========================================

  get<T>(url: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(url, options);
  }

  post<TRequest, TResponse>(
    url: string,
    body: TRequest,
    options?: ApiRequestOptions
  ): Observable<TResponse> {
    return this.http.post<TResponse>(url, body, options);
  }

  postText<TRequest>(
    url: string,
    body: TRequest,
    options?: ApiRequestOptions
  ): Observable<string> {
    return this.http.post(url, body, { ...options, responseType: 'text' });
  }

  put<TRequest, TResponse>(
    url: string,
    body: TRequest,
    options?: ApiRequestOptions
  ): Observable<TResponse> {
    return this.http.put<TResponse>(url, body, options);
  }

  patch<TRequest, TResponse>(
    url: string,
    body: TRequest,
    options?: ApiRequestOptions
  ): Observable<TResponse> {
    return this.http.patch<TResponse>(url, body, options);
  }

  delete<T>(url: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(url, options);
  }

  // ==========================================
  // NHÓM 2: CÁC HÀM ĐẶC THÙ (Xử lý tải file, lấy Header)
  // ==========================================

  /**
   * Dùng khi cần đọc thông tin từ Header của API (VD: X-Total-Count cho phân trang)
   */
  getResponse<T>(url: string, options?: ApiRequestOptions): Observable<HttpResponse<T>> {
    return this.http.get<T>(url, { ...options, observe: 'response' });
  }

  /**
   * Dùng khi tải file (PDF, Excel, Ảnh,...) từ server về
   */
  getBlob(url: string, options?: ApiRequestOptions): Observable<Blob> {
    return this.http.get(url, { ...options, responseType: 'blob' });
  }

  /**
   * Dùng khi cần đẩy file lên (Upload bằng FormData) nếu cần observe progress
   */
  postFormData<TResponse>(url: string, formData: FormData, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.post<TResponse>(url, formData, options);
  }
}
