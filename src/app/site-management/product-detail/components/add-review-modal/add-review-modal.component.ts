import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ProductReviewDraft, ProductReviewFormError } from '../../data-access/models/product-detail-view.model';

@Component({
  selector: 'app-add-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule],
  templateUrl: './add-review-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddReviewModalComponent {
  readonly productName = input.required<string>();
  readonly draft = input.required<ProductReviewDraft>();
  readonly error = input<ProductReviewFormError | null>(null);
  readonly submitting = input(false);

  readonly draftChange = output<ProductReviewDraft>();
  readonly submitReview = output<void>();
  readonly cancelReview = output<void>();

  readonly ratingValues = [1, 2, 3, 4, 5];

  updateRating(rating: number): void {
    this.draftChange.emit({ ...this.draft(), rating });
  }

  updateField(field: keyof ProductReviewDraft, value: string): void {
    this.draftChange.emit({ ...this.draft(), [field]: value });
  }
}
