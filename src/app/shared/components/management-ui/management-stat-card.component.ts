import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ManagementStatTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'dark';

@Component({
  selector: 'app-management-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="zt-management-stat" [class]="'zt-management-stat zt-management-stat--' + tone()">
      @if (hasIcon()) {
        <span class="zt-management-stat__icon">
          <ng-content select="[stat-icon]" />
        </span>
      }
      <div class="zt-management-stat__copy">
        <span>{{ label() }}</span>
        <strong>{{ value() }}</strong>
        @if (hint()) {
          <small>{{ hint() }}</small>
        } @else {
          <small><ng-content select="[stat-hint]" /></small>
        }
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .zt-management-stat {
        position: relative;
        overflow: hidden;
        display: flex;
        gap: 14px;
        min-height: 112px;
        padding: 18px 18px 18px 20px;
        border: 1px solid rgba(79, 70, 229, 0.1);
        border-radius: var(--zt-management-radius-xl, 18px);
        background:
          radial-gradient(circle at 88% 18%, rgba(79, 70, 229, 0.1), transparent 34%),
          radial-gradient(circle at 12% 0%, rgba(255, 199, 0, 0.1), transparent 30%),
          linear-gradient(145deg, #ffffff 0%, #f9fafb 72%, #eef2ff 100%);
        box-shadow: var(--zt-management-shadow-card, 0 14px 34px rgba(17, 24, 39, 0.055));
        color: #111827;
      }

      .zt-management-stat::before {
        content: '';
        position: absolute;
        inset: auto -34px -48px auto;
        width: 124px;
        height: 124px;
        border-radius: 999px;
        background: rgba(79, 70, 229, 0.08);
      }

      .zt-management-stat__icon,
      .zt-management-stat__copy {
        position: relative;
        z-index: 1;
      }

      .zt-management-stat__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.84);
        border-radius: 14px;
        background: #fff8df;
        color: #9a6b00;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 22px rgba(17, 24, 39, 0.07);
      }

      .zt-management-stat__icon ::ng-deep svg {
        width: 18px;
        height: 18px;
      }

      .zt-management-stat__copy {
        min-width: 0;
      }

      span,
      strong,
      small {
        display: block;
      }

      .zt-management-stat__copy > span {
        color: #6b7280;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      strong {
        margin-top: 6px;
        color: inherit;
        font-size: 20px;
        font-weight: 760;
        line-height: 1.15;
      }

      small {
        margin-top: 6px;
        color: rgba(79, 70, 50, 0.64);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.35;
      }

      .zt-management-stat--info .zt-management-stat__icon {
        background: #ecfeff;
        color: #0891b2;
      }

      .zt-management-stat--success .zt-management-stat__icon {
        background: #ecfdf5;
        color: #059669;
      }

      .zt-management-stat--warning .zt-management-stat__icon {
        background: #fffbeb;
        color: #d97706;
      }

      .zt-management-stat--danger .zt-management-stat__icon {
        background: #fff1f2;
        color: #be123c;
      }

      .zt-management-stat--dark {
        border-color: rgba(255, 199, 0, 0.28);
        background: linear-gradient(145deg, #101010 0%, #171717 100%);
        color: #ffc700;
      }

      .zt-management-stat--dark .zt-management-stat__copy > span,
      .zt-management-stat--dark small {
        color: rgba(255, 255, 255, 0.68);
      }
    `,
  ],
})
export class ManagementStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly tone = input<ManagementStatTone>('neutral');
  readonly hasIcon = input(true);
}
