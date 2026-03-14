import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  dropdownItems: string[];
}

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './site-header.component.html',
  styleUrls: ['./site-header.component.css']
})
export class SiteHeaderComponent {
  mobileMenuOpen = false;

  navItems: NavItem[] = [
    {
      label: 'Keyboards',
      dropdownItems: ['HE Keyboard', 'Mechanical Keyboard', 'Bundle, Up to $99 Off'],
    },
    {
      label: 'Mice',
      dropdownItems: ['All Mice', 'X Pro – 8000Hz', 'M1 Pro – 4000Hz', 'M2 – 1000Hz', 'Bundle, Up to $99 Off'],
    },
    {
      label: 'Speakers',
      dropdownItems: ['All Speakers', 'Mars Pro', 'Supernova', 'Bundle, Up to $99 Off'],
    },
    {
      label: 'Earbuds',
      dropdownItems: ['All Earbuds', 'Sirius Plus', 'Bundle, Up to $99 Off'],
    },
    {
      label: 'Chargers',
      dropdownItems: ['All Chargers', 'Alpha65', 'Delta35', 'Power Strip', 'Bundle, Up to $99 Off'],
    },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
