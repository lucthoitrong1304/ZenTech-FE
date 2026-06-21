import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideImageOff } from '@lucide/angular';
import { ChatProductRecommendation } from './chat-product-recommendations.model';

@Component({
  selector: 'app-chat-product-recommendations',
  standalone: true,
  imports: [RouterLink, LucideArrowRight, LucideImageOff],
  templateUrl: './chat-product-recommendations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatProductRecommendationsComponent {
  readonly products = input.required<ChatProductRecommendation[]>();
  protected readonly singleProduct = computed(() =>
    this.products().length === 1 ? this.products()[0] ?? null : null
  );
  protected readonly failedImages = new Set<string>();

  protected markImageFailed(productId: string): void {
    this.failedImages.add(productId);
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
