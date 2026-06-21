import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { ProductCategory } from '../../data-access/models/product-category.model';
import {
  ProductSortOption,
  ProductSortOptionValue,
} from '../../data-access/models/product-sort-option.model';

@Component({
  selector: 'app-product-listing-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-listing-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListingToolbarComponent {
  private readonly elementRef = inject(ElementRef);

  readonly category = input.required<ProductCategory>();
  readonly productCount = input(0);
  readonly sortOptions = input<ProductSortOption[]>([]);
  readonly selectedSort = input<ProductSortOptionValue>('featured');
  readonly sortChange = output<ProductSortOptionValue>();

  readonly isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update(prev => !prev);
  }

  selectOption(value: ProductSortOptionValue): void {
    this.sortChange.emit(value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  getSelectedLabel(): string {
    const current = this.sortOptions().find(opt => opt.value === this.selectedSort());
    return current ? current.label : '';
  }
}
