import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="zt-management-empty">
      <span class="zt-management-empty__icon">
        <ng-content select="[empty-icon]" />
      </span>
      <strong>{{ title() }}</strong>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .zt-management-empty {
        display: grid;
        justify-items: center;
        gap: 10px;
        padding: 44px 20px;
        color: #6b7280;
        text-align: center;
      }

      .zt-management-empty__icon {
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 16px;
        background: #fff8df;
        color: #9a6b00;
      }

      .zt-management-empty__icon ::ng-deep svg {
        width: 22px;
        height: 22px;
      }

      strong {
        color: #111827;
        font-size: 15px;
        font-weight: 700;
      }

      p {
        max-width: 440px;
        margin: 0;
        font-size: 13px;
        font-weight: 560;
        line-height: 1.5;
      }
    `,
  ],
})
export class ManagementEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}
