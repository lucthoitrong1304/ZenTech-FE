import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LucideChevronRight, LucideSparkles } from '@lucide/angular';

@Component({
  selector: 'app-owner-placeholder',
  standalone: true,
  imports: [LucideChevronRight, LucideSparkles],
  templateUrl: './owner-placeholder.component.html',
  styleUrl: './owner-placeholder.component.css',
})
export class OwnerPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = this.route.snapshot?.data ?? {};

  protected readonly title = this.routeData['title'] || 'Owner Workspace';
  protected readonly description =
    this.routeData['description'] || 'Khu vực này đang sẵn sàng để kết nối dữ liệu.';
}
