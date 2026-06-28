import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideImagePlus, LucideStar, LucideVideo, LucideX } from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import {
  ProductReviewDraft,
  ProductReviewFormError,
  ReviewImageUploadItem,
  ReviewVideoUploadItem,
} from '../../data-access/models/product-detail-view.model';

@Component({
  selector: 'app-add-review-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    TextareaModule,
    LucideImagePlus,
    LucideStar,
    LucideVideo,
    LucideX,
  ],
  templateUrl: './add-review-modal.component.html',
  styleUrl: './add-review-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddReviewModalComponent {
  readonly productName = input.required<string>();
  readonly draft = input.required<ProductReviewDraft>();
  readonly reviewImages = input<ReviewImageUploadItem[]>([]);
  readonly reviewVideo = input<ReviewVideoUploadItem | null>(null);
  readonly error = input<ProductReviewFormError | null>(null);
  readonly submitting = input(false);
  readonly imageUploading = input(false);
  readonly videoUploading = input(false);
  readonly isEditing = input(false);

  readonly draftChange = output<ProductReviewDraft>();
  readonly imageSelect = output<File[]>();
  readonly imageRemove = output<string>();
  readonly videoSelect = output<File>();
  readonly videoRemove = output<void>();
  readonly submitReview = output<void>();
  readonly cancelReview = output<void>();

  readonly ratingValues = [1, 2, 3, 4, 5];

  get maxImagesAllowed(): number {
    return this.reviewVideo() !== null ? 4 : 5;
  }

  get isMediaFull(): boolean {
    return this.reviewImages().length + (this.reviewVideo() !== null ? 1 : 0) >= 5;
  }

  updateRating(rating: number): void {
    this.draftChange.emit({ ...this.draft(), rating });
  }

  updateField(field: 'reviewerName' | 'title' | 'comment', value: string): void {
    this.draftChange.emit({ ...this.draft(), [field]: value });
  }

  onImageSelect(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);

    if (files.length > 0) {
      this.imageSelect.emit(files);
    }

    inputElement.value = '';
  }

  onVideoSelect(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (file) {
      this.videoSelect.emit(file);
    }

    inputElement.value = '';
  }
}
