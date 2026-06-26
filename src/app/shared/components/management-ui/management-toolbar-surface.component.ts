import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-toolbar-surface',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="zt-management-toolbar" [class.zt-management-toolbar--compact]="compact()">
      <ng-content />
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .zt-management-toolbar {
        min-width: 0;
        border: 1px solid var(--zt-management-border, #e5e7eb);
        border-radius: var(--zt-management-radius-lg, 10px);
        background: var(--zt-management-surface, #ffffff);
        box-shadow: var(--zt-management-shadow-soft, 0 16px 42px rgba(28, 27, 27, 0.045));
      }

      .zt-management-toolbar--compact {
        box-shadow: none;
      }
    `,
  ],
})
export class ManagementToolbarSurfaceComponent {
  readonly compact = input(false);
}
