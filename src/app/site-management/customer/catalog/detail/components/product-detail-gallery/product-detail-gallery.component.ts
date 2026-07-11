import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-product-detail-gallery',
  standalone: true,
  templateUrl: './product-detail-gallery.component.html',
  styleUrl: './product-detail-gallery.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailGalleryComponent {
  readonly images = input<string[]>([]);
  readonly productName = input('');
  readonly selectedImage = input('');
  readonly imageSelect = output<string>();
}
