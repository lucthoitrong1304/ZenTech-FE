import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideMinus, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { CartItem } from '../../data-access/models/cart.model';

@Component({
  selector: 'app-cart-item-row',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, LucideMinus, LucidePlus, LucideTrash2],
  templateUrl: './cart-item-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemRowComponent {
  readonly item = input.required<CartItem>();
  readonly increment = output<string>();
  readonly decrement = output<string>();
  readonly remove = output<string>();

  protected onIncrement(): void {
    this.increment.emit(this.item().variantId);
  }

  protected onDecrement(): void {
    this.decrement.emit(this.item().variantId);
  }

  protected onRemove(): void {
    this.remove.emit(this.item().variantId);
  }
}
