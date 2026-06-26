import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { MarkdownComponent } from 'ngx-markdown';
import { distinctUntilChanged, map } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CartItemDraft } from '../../../cart/data-access/models/cart.model';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import { ProductListItem } from '../../../product-catalog/data-access/models/product-catalog.models';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { ProductCardComponent } from '../../../product-listing/components/product-card/product-card.component';
import { ProductDetailStore } from '../../data-access/store/product-detail.store';
import { ProductReviewDraft } from '../../data-access/models/product-detail-view.model';
import { AddReviewModalComponent } from '../../components/add-review-modal/add-review-modal.component';
import { ProductDetailGalleryComponent } from '../../components/product-detail-gallery/product-detail-gallery.component';
import { ProductReviewListComponent } from '../../components/product-review-list/product-review-list.component';
import { ClientLogService } from '../../../../core/logging/client-log.service';
import { ClientLogEventType } from '../../../../core/logging/client-log.model';
import { setupLogoutMessageEffects } from '../../../auth/data-access/utils/logout-message-effects.util';

@Component({
  selector: 'app-product-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    ProductCardComponent,
    AddReviewModalComponent,
    ProductDetailGalleryComponent,
    ProductReviewListComponent,
    MarkdownComponent,
    LucideChevronDown,
    LucideChevronUp,
  ],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.css',
  providers: [ProductDetailStore],
})
export class ProductDetailPageComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  protected readonly productDetailStore = inject(ProductDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);
  private readonly clientLogService = inject(ClientLogService);

  readonly navItems = this.categoryNavigationStore.navItems;
  readonly currentUser = this.authSessionStore.currentUser;
  readonly selectedImage = signal('');
  readonly descriptionExpanded = signal(false);
  readonly displayImage = computed(
    () =>
      this.selectedImage() ||
      this.productDetailStore.gallery()[0] ||
      this.productDetailStore.product()?.image ||
      ''
  );
  readonly detailContentTitle = computed(() => 'Spec');
  readonly detailMarkdownContent = computed(() => {
    const product = this.productDetailStore.product();

    if (!product) {
      return '';
    }

    return product.specs
      .map(spec => `### ${spec.label}\n\n${spec.value}`)
      .join('\n\n');
  });
  readonly skeletonBlocks = Array.from({ length: 4 }, (_, index) => index);
  private readonly productSlug = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug')?.trim() ?? ''),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  constructor() {
    effect(() => {
      const slug = this.productSlug();

      if (slug) {
        untracked(() => {
          this.selectedImage.set('');
          this.descriptionExpanded.set(false);
          this.productDetailStore.loadProduct(slug);
        });
      }
    });

    effect(() => {
      const image = this.productDetailStore.product()?.image ?? '';

      if (image) {
        if (!this.selectedImage()) {
          this.selectedImage.set(image);
        }
      }
    });

    effect(() => {
      const product = this.productDetailStore.product();

      if (product) {
        untracked(() => {
          this.clientLogService.info(
            ClientLogEventType.ProductViewed,
            `Người dùng xem chi tiết sản phẩm ${product.name}.`,
            {
              routeUrl: this.router.url,
              productId: product.id,
            },
          );
        });
      }
    });

    effect(() => {
      const message = this.productDetailStore.reviewSuccessMessage();

      if (message) {
        untracked(() => {
        this.toastService.success(message);
        this.productDetailStore.clearReviewSuccessMessage();
        });
      }
    });

    setupLogoutMessageEffects(this.authSessionStore, this.toastService, this.router);
  }

  onImageSelect(image: string): void {
    this.selectedImage.set(image);
  }

  onReviewDraftChange(draft: ProductReviewDraft): void {
    this.productDetailStore.updateReviewDraft(draft);
  }

  onReviewImageSelect(files: File[]): void {
    this.productDetailStore.selectReviewImages(files);
  }

  onReviewImageRemove(imageId: string): void {
    this.productDetailStore.removeReviewImage(imageId);
  }

  onReviewVideoSelect(file: File): void {
    this.productDetailStore.selectReviewVideo(file);
  }

  onReviewVideoRemove(): void {
    this.productDetailStore.removeReviewVideo();
  }

  onRelatedProductClick(product: ProductListItem): void {
    this.selectedImage.set(product.image);
  }

  onVariantSelect(variantId: string): void {
    this.productDetailStore.selectVariant(variantId);
  }

  toggleDescription(): void {
    this.descriptionExpanded.update(value => !value);
  }

  openReviewModal(): void {
    this.productDetailStore.openReviewModal();
  }

  closeReviewModal(): void {
    this.productDetailStore.closeReviewModal();
  }

  submitReview(): void {
    this.productDetailStore.submitReview();
  }

  addSelectedProductToCart(): void {
    const draft = this.createSelectedCartItemDraft();

    if (!draft) {
      this.toastService.warning('Vui lòng chọn variant còn hàng trước khi thêm vào giỏ.');
      return;
    }

    if (!this.authSessionStore.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.cartStore.addItem(draft);
    this.clientLogService.info(
      ClientLogEventType.CartItemAdded,
      `Người dùng thêm sản phẩm ${draft.productName} vào giỏ hàng.`,
      {
        routeUrl: this.router.url,
        productId: draft.productId,
        quantity: draft.quantity,
      },
    );
    this.toastService.success(`${draft.productName} đã được thêm vào giỏ hàng.`);
  }

  buySelectedProductNow(): void {
    const draft = this.createSelectedCartItemDraft();

    if (!draft) {
      this.toastService.warning('Vui lòng chọn variant còn hàng trước khi mua.');
      return;
    }

    if (!this.authSessionStore.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.cartStore.addItem(draft);
    this.clientLogService.info(
      ClientLogEventType.CartItemAdded,
      `Người dùng mua ngay sản phẩm ${draft.productName}.`,
      {
        routeUrl: this.router.url,
        productId: draft.productId,
        quantity: draft.quantity,
        result: 'BuyNow',
      },
    );
    this.router.navigate(['/cart']);
  }

  incrementQuantity(): void {
    this.productDetailStore.incrementQuantity();
  }

  decrementQuantity(): void {
    this.productDetailStore.decrementQuantity();
  }

  onLogout(): void {
    this.authSessionStore.logout();
  }

  private createSelectedCartItemDraft(): CartItemDraft | null {
    const product = this.productDetailStore.product();
    const variant = this.productDetailStore.selectedVariant();
    const quantity = this.productDetailStore.quantity();

    if (!product || !variant || variant.stockQuantity <= 0 || quantity <= 0) {
      return null;
    }

    return {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      image: product.image,
      unitPrice: variant.salePrice ?? variant.originalPrice,
      originalPrice: variant.salePrice ? variant.originalPrice : product.originalPrice,
      quantity,
      maxQuantity: variant.stockQuantity,
    };
  }
}
