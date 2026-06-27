import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-management-data-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="zt-management-data-panel" [class.zt-management-data-panel--flush]="flush()">
      @if (panelTitle() || panelDescription()) {
        <header class="zt-management-data-panel__header">
          <div>
            @if (panelTitle()) {
              <h2>{{ panelTitle() }}</h2>
            }
            @if (panelDescription()) {
              <p>{{ panelDescription() }}</p>
            }
          </div>
          <ng-content select="[panel-actions]" />
        </header>
      }

      <div class="zt-management-data-panel__body">
        <ng-content />
      </div>

      <ng-content select="[panel-footer]" />
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .zt-management-data-panel {
        overflow: hidden;
        border: 1px solid var(--zt-management-border, #e5e7eb);
        border-radius: var(--zt-management-radius-lg, 10px);
        background: var(--zt-management-surface, #ffffff);
        box-shadow: var(--zt-management-shadow-soft, 0 16px 42px rgba(28, 27, 27, 0.045));
      }

      .zt-management-data-panel--flush {
        border: 0;
        box-shadow: none;
      }

      .zt-management-data-panel__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--zt-management-border, #e5e7eb);
      }

      h2,
      p {
        margin: 0;
      }

      h2 {
        color: #111827;
        font-size: 16px;
        font-weight: 760;
        letter-spacing: 0;
      }

      p {
        margin-top: 4px;
        color: #6b7280;
        font-size: 12px;
        font-weight: 560;
        line-height: 1.45;
      }

      .zt-management-data-panel__body {
        min-width: 0;
      }
    `,
  ],
})
export class ManagementDataPanelComponent {
  readonly panelTitle = input('');
  readonly panelDescription = input('');
  readonly flush = input(false);
}
