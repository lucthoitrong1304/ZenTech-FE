import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import {
  LucideSearch,
  LucideLoader2,
  LucidePackageOpen,
  LucideCornerDownLeft,
  LucideLayoutDashboard,
  LucideShoppingBag,
  LucidePackage,
  LucideUsers,
  LucideMessageCircle,
} from '@lucide/angular';
import { CommandPaletteService, CommandPaletteItem } from '../../data-access/services/command-palette.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DialogModule,
    LucideSearch,
    LucideLoader2,
    LucidePackageOpen,
    LucideCornerDownLeft,
    LucideLayoutDashboard,
    LucideShoppingBag,
    LucidePackage,
    LucideUsers,
    LucideMessageCircle,
  ],
  templateUrl: './command-palette.component.html',
  styleUrls: ['./command-palette.component.css']
})
export class CommandPaletteComponent {
  public commandPaletteService = inject(CommandPaletteService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Computed state
  isOpen = this.commandPaletteService.isOpen;
  searchQuery = this.commandPaletteService.searchQuery;
  results = this.commandPaletteService.results;
  isLoading = this.commandPaletteService.isLoading;

  // Local state for keyboard navigation
  selectedIndex = 0;
  
  // Flattened items for easy keyboard navigation
  flatItems = computed(() => {
    return this.results().flatMap(group => group.items);
  });

  constructor() {
    effect(() => {
      // Reset selected index when query changes or when opened
      this.searchQuery();
      this.isOpen();
      this.selectedIndex = 0;
    });
  }

  // Handle global shortcut Cmd+K or Ctrl+K
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.commandPaletteService.toggle();
    }
  }

  onDialogShow() {
    // Focus search input when dialog opens
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 0);
  }

  onHide() {
    this.commandPaletteService.close();
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.commandPaletteService.setSearchQuery(value);
  }

  onKeyDown(event: KeyboardEvent) {
    const items = this.flatItems();
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % items.length;
      this.scrollToSelected();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
      this.scrollToSelected();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selectedItem = items[this.selectedIndex];
      if (selectedItem) {
        this.selectItem(selectedItem);
      }
    } else if (event.key === 'Escape') {
      this.commandPaletteService.close();
    }
  }

  selectItem(item: CommandPaletteItem) {
    if (item.action) {
      item.action();
    } else if (item.path) {
      this.router.navigateByUrl(item.path);
    }
    this.commandPaletteService.close();
  }

  private scrollToSelected() {
    setTimeout(() => {
      const selectedEl = document.querySelector('.command-item-active');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }
}
