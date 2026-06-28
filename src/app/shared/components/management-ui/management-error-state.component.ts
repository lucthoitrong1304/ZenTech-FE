import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="zt-management-error" role="alert">
      <div>
        <strong>{{ title() }}</strong>
        @if (message()) {
          <span>{{ message() }}</span>
        }
      </div>
      <ng-content />
    </section>
  `,
  styles: [
    `
      .zt-management-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
        border: 1px solid rgba(225, 29, 72, 0.14);
        border-radius: var(--zt-management-radius-lg, 10px);
        background: #fff1f2;
        color: #9f1239;
      }

      div {
        display: grid;
        gap: 4px;
      }

      strong {
        font-size: 14px;
        font-weight: 700;
      }

      span {
        color: #be123c;
        font-size: 13px;
        font-weight: 560;
      }

      ::ng-deep button {
        min-height: 38px;
        border: 0;
        border-radius: 8px;
        background: #111827;
        color: #ffffff;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        padding: 0 16px;
      }

      @media (max-width: 640px) {
        .zt-management-error {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ManagementErrorStateComponent {
  readonly title = input.required<string>();
  readonly message = input('');
}
