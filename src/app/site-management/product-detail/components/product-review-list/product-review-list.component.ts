import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProductReview } from '../../../product-catalog/data-access/models/product-catalog.models';

@Component({
  selector: 'app-product-review-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-review-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReviewListComponent {
  readonly reviews = input<ProductReview[]>([]);
}
