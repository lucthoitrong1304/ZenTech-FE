import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEmptyStateComponent {
  readonly isInvalidCategory = input(false);
  readonly title = input('Danh mục này chưa có sản phẩm.');
  readonly description = input(
    'Mock data cho danh mục này đang trống. Bạn có thể quay về trang chủ hoặc khám phá danh mục khác.'
  );
}
