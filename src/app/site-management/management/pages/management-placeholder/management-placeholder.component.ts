import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LucideChevronRight, LucideSparkles } from '@lucide/angular';

@Component({
  selector: 'app-management-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [LucideChevronRight, LucideSparkles],
  templateUrl: './management-placeholder.component.html',
  styleUrl: './management-placeholder.component.css',
})
export class ManagementPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = this.route.snapshot?.data ?? {};

  protected readonly title = this.routeData['title'] || 'Management Workspace';
  protected readonly description =
    this.routeData['description'] || 'Khu vực này đang sẵn sàng để kết nối dữ liệu.';
}
