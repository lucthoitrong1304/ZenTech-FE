import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideArrowRight, LucideShieldCheck, LucideTruck } from '@lucide/angular';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CurrencyPipe, LucideArrowRight, LucideShieldCheck, LucideTruck],
  templateUrl: './cart-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryComponent {
  readonly itemCount = input(0);
  readonly subtotal = input(0);
  readonly total = input(0);
  readonly canCheckout = input(true);
  readonly checkoutLabel = input('Proceed to Checkout');
  readonly checkout = output<void>();
}
