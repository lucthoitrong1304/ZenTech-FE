import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCategory } from '../../data-access/models/product-category.model';
import {
  ProductSortOption,
  ProductSortOptionValue,
} from '../../data-access/models/product-sort-option.model';

@Component({
  selector: 'app-product-listing-toolbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-listing-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListingToolbarComponent {
  readonly category = input.required<ProductCategory>();
  readonly productCount = input(0);
  readonly sortOptions = input<ProductSortOption[]>([]);
  readonly selectedSort = input<ProductSortOptionValue>('featured');
  readonly sortChange = output<ProductSortOptionValue>();

  onSortChange(value: string): void {
    this.sortChange.emit(value as ProductSortOptionValue);
  }
}
