import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { CheckInRequest, CheckInResponse } from '../models/attendance.model';

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
}
