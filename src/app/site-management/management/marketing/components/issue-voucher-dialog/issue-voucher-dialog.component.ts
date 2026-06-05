import { CommonModule } from '@angular/common';
import { Component, input, output, signal, effect, HostListener, ElementRef, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX, LucideTriangleAlert, LucideSparkles, LucideSearch, LucideCheck } from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { CustomerSummary, ManagementCoupon } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-issue-voucher-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, LucideX, LucideTriangleAlert, LucideSparkles, LucideSearch, LucideCheck],
  templateUrl: './issue-voucher-dialog.component.html',
  styleUrl: './issue-voucher-dialog.component.css',
})
export class IssueVoucherDialogComponent {
  visible = input<boolean>(false);
  coupons = input<ManagementCoupon[]>([]);
  customers = input<CustomerSummary[]>([]);
  formValue = input<{ couponId: string; customerId: string | null } | null>(null);
  saving = input<boolean>(false);
  errors = input<Record<string, string>>({});

  close = output<void>();
  save = output<void>();
  formValueChange = output<{ couponId: string; customerId: string | null }>();

  protected readonly issueToAll = signal<boolean>(true);
  protected readonly dropdownOpen = signal<boolean>(false);
  protected readonly searchTerm = signal<string>('');

  private readonly elementRef = inject(ElementRef);

  protected readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.customers();
    if (!term) return list;
    return list.filter(
      c => c.fullName.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)
    );
  });

  protected get selectedCustomer(): CustomerSummary | null {
    const current = this.formValue();
    if (!current || !current.customerId) return null;
    return this.customers().find(c => c.customerId === current.customerId) || null;
  }

  constructor() {
    effect(() => {
      if (this.visible()) {
        const current = this.formValue();
        this.issueToAll.set(current ? current.customerId === null : true);
        this.dropdownOpen.set(false);
        this.searchTerm.set('');
      }
    });
  }

  protected updateCoupon(couponId: string): void {
    const current = this.formValue();
    if (current) {
      this.formValueChange.emit({
        couponId,
        customerId: current.customerId,
      });
    }
  }

  protected updateCustomer(customerId: string | null): void {
    const current = this.formValue();
    if (current) {
      this.formValueChange.emit({
        couponId: current.couponId,
        customerId,
      });
    }
  }

  protected toggleIssueToAll(value: boolean): void {
    this.issueToAll.set(value);
    const current = this.formValue();
    if (current) {
      this.formValueChange.emit({
        couponId: current.couponId,
        customerId: value ? null : (this.customers().length > 0 ? this.customers()[0].customerId : null),
      });
    }
  }

  protected toggleDropdown(event: Event): void {
    event.stopPropagation();
    if (this.saving()) return;
    this.dropdownOpen.update(o => !o);
  }

  protected selectCustomer(customerId: string): void {
    this.updateCustomer(customerId);
    this.dropdownOpen.set(false);
    this.searchTerm.set('');
  }

  protected getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  protected getAvatarColor(name: string): string {
    const colors = [
      '#4F46E5', // Indigo
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Rose
      '#8B5CF6', // Violet
      '#06B6D4', // Cyan
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isInside = this.elementRef.nativeElement.contains(target);
    if (!isInside) {
      this.dropdownOpen.set(false);
    }
  }

  protected onSubmit(): void {
    this.save.emit();
  }

  protected failedImages = new Set<string>();

  protected onImageError(customerId: string): void {
    this.failedImages.add(customerId);
  }

  protected isImageFailed(customerId: string): boolean {
    return this.failedImages.has(customerId);
  }
}
