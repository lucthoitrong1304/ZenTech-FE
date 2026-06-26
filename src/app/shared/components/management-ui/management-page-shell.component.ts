import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-page-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="zt-management-page" [class.zt-management-page--compact]="compact()">
      <ng-content />
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .zt-management-page {
        display: grid;
        gap: 22px;
        min-width: 0;
        color: var(--zt-management-text, #1c1b1b);
      }

      .zt-management-page--compact {
        gap: 16px;
      }
    `,
  ],
})
export class ManagementPageShellComponent {
  readonly compact = input(false);
}
