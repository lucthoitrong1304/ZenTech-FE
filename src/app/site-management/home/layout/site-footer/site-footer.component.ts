import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './site-footer.component.html',
  styleUrls: ['./site-footer.component.css']
})
export class SiteFooterComponent {
  year = new Date().getFullYear();

  columns: FooterColumn[] = [
    {
      heading: 'Support',
      links: [
        { label: 'Software Download', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Warranty', href: '#' },
        { label: 'Shipping', href: '#' },
        { label: 'Return Policy', href: '#' },
        { label: 'Privacy Policy', href: '#' },
      ],
    },
    {
      heading: 'About',
      links: [
        { label: 'About Us', href: '#' },
        { label: 'Press', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Contact', href: '#' },
      ],
    },
    {
      heading: 'Explore',
      links: [
        { label: 'Discord Community', href: '#' },
        { label: 'Loyalty Program', href: '#' },
        { label: 'Reward Points', href: '#' },
      ],
    },
  ];
}
