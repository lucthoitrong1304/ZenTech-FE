import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-management-no-permission',
  standalone: true,
  templateUrl: './management-no-permission.component.html',
  styleUrl: './management-no-permission.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagementNoPermissionComponent {}
