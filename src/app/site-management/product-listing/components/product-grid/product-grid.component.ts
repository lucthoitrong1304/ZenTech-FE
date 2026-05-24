import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProductListItem } from '../../data-access/models/product-list-item.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './product-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGridComponent {
  readonly products = input<ProductListItem[]>([]);
  readonly addToCart = output<ProductListItem>();

  trackByProductId(_: number, product: ProductListItem): string {
    return product.id;
  }
}
