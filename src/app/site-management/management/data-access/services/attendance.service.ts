import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { 
  CheckInRequest, 
  CheckInResponse,
  AttendanceReportApiResponse 
} from '../models/attendance.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance`;

  checkIn(payload: CheckInRequest): Observable<CheckInResponse> {
    return this.apiService.post<CheckInRequest, CheckInResponse>(
      `${this.baseUrl}/check-in`,
      payload
    );
  }

  getReport(startDate: string, endDate: string, page: number = 0, size: number = 10): Observable<AttendanceReportApiResponse> {
    return this.apiService.get<AttendanceReportApiResponse>(
      `${this.baseUrl}/report`,
      {
        params: {
          startDate,
          endDate,
          page: page.toString(),
          size: size.toString()
        }
      }
    );
  }
}
