import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-page-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="zt-management-hero" [class.zt-management-hero--compact]="compact()">
      <div class="zt-management-hero__copy">
        @if (eyebrow()) {
          <span class="zt-management-hero__eyebrow">{{ eyebrow() }}</span>
        }
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p>{{ description() }}</p>
        }
      </div>

      <div class="zt-management-hero__actions">
        <ng-content select="[hero-actions]" />
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .zt-management-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        min-height: 128px;
        padding: 24px;
        border: 1px solid var(--zt-management-border-soft, rgba(210, 197, 171, 0.16));
        border-radius: var(--zt-management-radius-lg, 10px);
        background:
          linear-gradient(135deg, rgba(251, 188, 4, 0.1), transparent 42%),
          linear-gradient(315deg, rgba(79, 70, 229, 0.06), transparent 38%),
          var(--zt-management-surface, #ffffff);
        box-shadow: var(--zt-management-shadow-soft, 0 16px 42px rgba(28, 27, 27, 0.045));
      }

      .zt-management-hero--compact {
        min-height: 104px;
        padding: 20px;
      }

      .zt-management-hero__copy {
        min-width: 0;
      }

      .zt-management-hero__eyebrow {
        display: block;
        color: var(--zt-management-text-muted, rgba(79, 70, 50, 0.6));
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        margin: 8px 0;
        color: var(--zt-management-heading, #111827);
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0;
        line-height: 1.05;
      }

      p {
        max-width: 760px;
        margin: 0;
        color: var(--zt-management-text-subtle, rgba(79, 70, 50, 0.72));
        font-size: 13px;
        font-weight: 560;
        line-height: 1.55;
      }

      .zt-management-hero__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }

      @media (max-width: 760px) {
        .zt-management-hero {
          align-items: stretch;
          flex-direction: column;
          min-height: auto;
        }

        .zt-management-hero__actions {
          justify-content: stretch;
        }

        .zt-management-hero__actions ::ng-deep button,
        .zt-management-hero__actions ::ng-deep a {
          width: 100%;
        }
      }
    `,
  ],
})
export class ManagementPageHeroComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly compact = input(false);
}
