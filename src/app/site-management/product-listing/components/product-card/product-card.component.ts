import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ProductListItem } from '../../data-access/models/product-list-item.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TooltipModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product = input.required<ProductListItem>();
  readonly addToCart = output<ProductListItem>();

  onAddToCart(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.product().inStock) {
      return;
    }

    this.addToCart.emit(this.product());
  }
}
