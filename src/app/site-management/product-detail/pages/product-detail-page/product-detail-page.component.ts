import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { ProductListItem } from '../../../product-catalog/data-access/models/product-catalog.models';
import { SITE_CATEGORY_NAV_ITEMS } from '../../../shared/site-navigation.constants';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { ProductCardComponent } from '../../../product-listing/components/product-card/product-card.component';
import { ProductDetailStore } from '../../data-access/store/product-detail.store';
import { ProductReviewDraft } from '../../data-access/models/product-detail-view.model';
import { AddReviewModalComponent } from '../../components/add-review-modal/add-review-modal.component';
import { ProductDetailGalleryComponent } from '../../components/product-detail-gallery/product-detail-gallery.component';
import { ProductReviewListComponent } from '../../components/product-review-list/product-review-list.component';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    ProductCardComponent,
    AddReviewModalComponent,
    ProductDetailGalleryComponent,
    ProductReviewListComponent,
  ],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.css',
  providers: [ProductDetailStore],
})
export class ProductDetailPageComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productDetailStore = inject(ProductDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly navItems = SITE_CATEGORY_NAV_ITEMS;
  readonly currentUser$ = this.authSessionStore.currentUser$;
  readonly vm$ = this.productDetailStore.vm$;
  readonly selectedImage = signal('');
  readonly skeletonBlocks = Array.from({ length: 4 }, (_, index) => index);

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => params.get('slug')?.trim() ?? ''),
        filter(Boolean),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(slug => {
        this.selectedImage.set('');
        this.productDetailStore.loadProduct(slug);
      });

    this.vm$
      .pipe(
        map(vm => vm.product?.image ?? ''),
        filter(Boolean),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(image => {
        if (!this.selectedImage()) {
          this.selectedImage.set(image);
        }
      });

    this.productDetailStore.reviewSuccessMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
        this.productDetailStore.clearReviewSuccessMessage();
      });

    this.authSessionStore.logoutSuccessMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
        this.authSessionStore.clearLogoutMessages();
        this.router.navigate(['/']);
      });

    this.authSessionStore.logoutWarningMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.warning(message);
        this.authSessionStore.clearLogoutMessages();
        this.router.navigate(['/']);
      });
  }

  onImageSelect(image: string): void {
    this.selectedImage.set(image);
  }

  onReviewDraftChange(draft: ProductReviewDraft): void {
    this.productDetailStore.updateReviewDraft(draft);
  }

  onRelatedProductClick(product: ProductListItem): void {
    this.selectedImage.set(product.image);
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

  incrementQuantity(): void {
    this.productDetailStore.incrementQuantity();
  }

  decrementQuantity(): void {
    this.productDetailStore.decrementQuantity();
  }

  onLogout(): void {
    this.authSessionStore.logout();
  }
}
