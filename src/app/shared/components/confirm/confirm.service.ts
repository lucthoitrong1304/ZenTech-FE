import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';
import { ConfirmDialogData, ConfirmSize } from './confirm.model';

@Injectable({
  providedIn: 'root',
})
export class ConfirmService {
  private readonly confirmationService = inject(ConfirmationService);

  open(data: ConfirmDialogData): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.confirmationService.confirm({
        header: data.title,
        message: data.content,
        acceptLabel: 'Yes',
        rejectLabel: 'No',
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        },
      });

      return () => this.confirmationService.close();
    });
  }
}

export function getConfirmDialogWidth(size: ConfirmSize = ConfirmSize.SMALL): string {
  const widthMap: Record<ConfirmSize, string> = {
    [ConfirmSize.SMALL]: '400px',
    [ConfirmSize.MEDIUM]: '600px',
    [ConfirmSize.LARGE]: '800px',
  };

  return widthMap[size];
}
