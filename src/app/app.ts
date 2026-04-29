import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastComponent } from './shared/components/toast/toast.component';
import { CategoryNavigationStore } from './site-management/shared/data-access/store/category-navigation.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogModule, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  protected readonly title = signal('ZenTech-FE');

  constructor() {
    this.categoryNavigationStore.loadCategoriesOnce();
  }
}
