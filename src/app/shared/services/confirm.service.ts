import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmComponent } from '../components/confirm/confirm.component';
import { ConfirmDialogData, ConfirmSize } from '../models/confirm.model';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private dialog = inject(MatDialog);

  /**
   * Opens a confirmation dialog.
   * @param data Configuration options for the dialog (title, content, size).
   * @returns An observable that emits true if the user clicks "Yes", false if "No" or backdrop click.
   */
  open(data: ConfirmDialogData): Observable<boolean> {
    const size = data.size || ConfirmSize.SMALL;
    let width = '400px';
    
    switch (size) {
      case ConfirmSize.MEDIUM:
        width = '600px';
        break;
      case ConfirmSize.LARGE:
        width = '800px';
        break;
      case ConfirmSize.SMALL:
      default:
        width = '400px';
        break;
    }

    const dialogRef = this.dialog.open(ConfirmComponent, {
      data,
      width,
      maxWidth: '90vw', // Responsive width capping
      panelClass: 'confirm-dialog-container',
      disableClose: false,
      autoFocus: 'dialog'
    });

    return dialogRef.afterClosed().pipe(
      map(result => !!result)
    );
  }
}
