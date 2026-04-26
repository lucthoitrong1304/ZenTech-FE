import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProductCategory } from '../../data-access/models/product-category.model';

@Component({
  selector: 'app-product-listing-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-listing-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListingHeroComponent {
  readonly category = input.required<ProductCategory>();
  readonly productCount = input(0);
}
