import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  HeaderNavItem,
  HeaderUser,
  SiteHeaderComponent
} from '../shared/site-header/site-header.component';

interface StatItem {
  label: string;
  value: string;
}

interface CategoryCard {
  title: string;
  subtitle: string;
  image: string;
  layoutClass: string;
  minHeightClass: string;
}

interface ProductCard {
  title: string;
  image: string;
  badge: string;
  badgeTone: 'red' | 'purple';
  price: number;
  originalPrice: number;
}

interface PromoCard {
  eyebrow: string;
  title: string;
  description?: string;
  image?: string;
  tone: 'dark' | 'accent' | 'light';
  cta?: string;
}

interface CommunityMember {
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SiteHeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  readonly cartCount = 2;
  activeNavLabel: string | null = null;

  readonly navItems: HeaderNavItem[] = [
    { label: 'Keyboards', link: '/' },
    { label: 'Mice', link: '/' },
    { label: 'Speakers', link: '/' },
    { label: 'Earbuds', link: '/' },
    { label: 'Chargers', link: '/' },
    { label: 'Accessories', link: '/' }
  ];

  readonly heroStats: StatItem[] = [
    { label: 'Status', value: 'Operating' },
    { label: 'Core', value: 'Gen-4 Magnetic' }
  ];

  readonly categories: CategoryCard[] = [
    {
      title: 'Keyboards',
      subtitle: 'Precision instruments',
      image: '/home/asset-5.webp',
      layoutClass: 'md:col-span-8 md:row-span-2',
      minHeightClass: 'min-h-[19rem]'
    },
    {
      title: 'Mice',
      subtitle: 'Rapid response',
      image: '/home/asset-7.webp',
      layoutClass: 'md:col-span-4',
      minHeightClass: 'min-h-[16rem]'
    },
    {
      title: 'Speakers',
      subtitle: 'Acoustic purity',
      image: '/home/asset-6.webp',
      layoutClass: 'md:col-span-4',
      minHeightClass: 'min-h-[16rem]'
    },
    {
      title: 'Earbuds',
      subtitle: 'Sonic freedom',
      image: '/home/asset-2.webp',
      layoutClass: 'md:col-span-6',
      minHeightClass: 'min-h-[16rem]'
    },
    {
      title: 'Chargers',
      subtitle: 'Eternal flow',
      image: '/home/asset-3.webp',
      layoutClass: 'md:col-span-6',
      minHeightClass: 'min-h-[16rem]'
    }
  ];

  readonly flashSaleEndsAt = '04:22:15';

  readonly flashSales: ProductCard[] = [
    {
      title: 'Mercury V60 Pro Deluxe',
      image: '/home/asset-7.webp',
      badge: 'Save 20%',
      badgeTone: 'red',
      price: 109,
      originalPrice: 139
    },
    {
      title: 'Neon Graffiti Edition',
      image: '/home/asset-9.webp',
      badge: 'New Drop',
      badgeTone: 'purple',
      price: 159,
      originalPrice: 199
    },
    {
      title: 'Ion Core 120W Max',
      image: '/home/asset-3.webp',
      badge: 'Save 15%',
      badgeTone: 'red',
      price: 67,
      originalPrice: 79
    },
    {
      title: 'Vortex Studio ANC',
      image: '/home/asset-2.webp',
      badge: 'Save $50',
      badgeTone: 'red',
      price: 249,
      originalPrice: 299
    }
  ];

  readonly featurePromo: PromoCard = {
    eyebrow: 'Custom Shop',
    title: 'Build Your Signature Sound',
    description:
      'Experience our online customizer for the Mercury HE platform. Every switch, every spring, every plate tuned to your specific acoustic preference.',
    image: '/home/asset-9.webp',
    tone: 'dark',
    cta: 'Start Customizing'
  };

  readonly sidePromos: PromoCard[] = [
    {
      eyebrow: 'Ecosystem',
      title: 'ZenLink Seamless Connectivity',
      tone: 'accent'
    },
    {
      eyebrow: 'Community',
      title: 'Join the Tech Vanguard',
      description: '42k+ members sharing custom builds, sound tests, and first-look drops.',
      tone: 'light'
    }
  ];

  readonly communityMembers: CommunityMember[] = [
    { name: 'Morgan', avatar: '/home/asset-10.webp' },
    { name: 'Avery', avatar: '/home/asset-8.webp' },
    { name: 'Kai', avatar: '/home/asset-1.webp' }
  ];

  readonly userScenarios = {
    guest: null,
    signedInNoAvatar: {
      isAuthenticated: true,
      fullName: 'Zen Tran',
      avatarUrl: null
    },
    signedInWithAvatar: {
      isAuthenticated: true,
      fullName: 'Zen Tran',
      avatarUrl: '/home/asset-4.webp'
    }
  } satisfies Record<string, HeaderUser | null>;

  readonly currentUser: HeaderUser | null = this.userScenarios.guest;

  readonly footerColumns = [
    {
      title: 'Product',
      links: ['Keyboards', 'Mice', 'Audio', 'Power']
    },
    {
      title: 'Company',
      links: ['About', 'Press', 'Careers', 'Contact']
    }
  ];

  onNavSelect(item: HeaderNavItem): void {
    this.activeNavLabel = item.label;
  }
}
