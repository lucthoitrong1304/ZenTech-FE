import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, signal, untracked, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../auth/data-access/store/auth-session.store';
import { CartStore } from '../cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '../shared/data-access/store/category-navigation.store';
import { HeaderNavItem } from '../shared/site-navigation.models';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';

interface StatItem {
  label: string;
  value: string;
}

interface HeroSlide {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  primaryCta: string;
  secondaryCta: string;
}

interface CategoryCard {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  size: 'large' | 'small';
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

interface VideoCard {
  title: string;
  creator: string;
  image: string;
  youtubeId: string;
}

interface Testimonial {
  quote: string;
  source: string;
  image: string;
}

interface CommunityMember {
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, RouterLink, SiteHeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly categoryNavigationStore = inject(CategoryNavigationStore);
  protected readonly cartStore = inject(CartStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly currentUser = this.authSessionStore.currentUser;
  readonly navItems = this.categoryNavigationStore.navItems;
  readonly activeNavLabel = signal<string | null>(null);
  readonly activeHeroSlide = signal(0);
  readonly activeTestimonial = signal(0);
  readonly selectedVideoId = signal<string | null>(null);

  readonly announcementMessages = [
    'A new level. A new universe. New arrival V60 Pro HE Keyboard',
    '8K polling. Magnetic switches. Built for competitive desks',
    'Cyber setup deals are live for keyboards, mice and audio gear',
    'Free shipping for featured gaming bundles this week',
    'Members unlock early access drops and exclusive vouchers',
    'Level up your battle station with ZenTech essentials',
  ];

  readonly heroSlides: HeroSlide[] = [
    {
      eyebrow: 'New Arrival 2026',
      title: 'Mercury K98 Pro',
      description:
        'Retain the numpad, unlock dual 8K precision and bring a full-size sci-fi command center to your gaming desk.',
      image: '/home/mercury-k98-pro-mechaniccal-gaming-keyboard-1002.webp',
      primaryCta: 'Shop Now',
      secondaryCta: 'Explore Keyboard',
    },
    {
      eyebrow: 'Pre-Order Special',
      title: 'Claim 2 Free Cyber Gears',
      description:
        'Complete your loadout with limited launch perks, futuristic desk gear and a sharper ZenTech gaming setup.',
      image: '/home/20260501-164934.webp',
      primaryCta: 'Pre-Order Now',
      secondaryCta: 'View Deals',
    },
  ];

  readonly heroStats: StatItem[] = [
    { label: 'Latency', value: '8K Hz' },
    { label: 'Switch', value: 'Magnetic HE' },
    { label: 'Frame', value: 'CNC Alloy' },
  ];

  readonly categories: CategoryCard[] = [
    {
      slug: 'keyboards',
      title: 'Shop Keyboard',
      subtitle: 'Hall Effect / Mechanical',
      image: '/home/1_8903b6a7-cea7-481d-ac1b-31d5ac7950ad.webp',
      size: 'large',
    },
    {
      slug: 'mice',
      title: 'Shop Mouse',
      subtitle: '8K wireless precision',
      image: '/home/6_eae6f3cd-3b4c-4fb7-b615-621e2fb41b13.webp',
      size: 'small',
    },
    {
      slug: 'chargers',
      title: 'Shop Charger',
      subtitle: 'Fast power core',
      image:
        '/home/Gan-fast-charger-65w-power-adapter-gravastar-alpha65-robot-charger-blue-14.webp',
      size: 'small',
    },
    {
      slug: 'earbuds',
      title: 'Shop Earbud',
      subtitle: 'Portable sonic armor',
      image: '/home/Anc-earbuds-noise-cancelling-headphones-gravastar-sirius-plus-black-5.jpg',
      size: 'small',
    },
    {
      slug: 'speakers',
      title: 'Shop Speaker',
      subtitle: 'Desktop audio beast',
      image: '/home/382db98bc3940982e4a12468e7fd68ae_739b6dc5-6abf-489c-9ee8-40a8c4249053.webp',
      size: 'large',
    },
  ];

  readonly flashSaleEndsAt = '04:22:15';

  readonly flashSales: ProductCard[] = [
    {
      title: 'GravaStar V60 Pro & X Pro Gaming Set',
      image: '/home/gravastar-v60-pro-8khz-magnetic-switch-gaming-keyboard-1001_ad8079ca-c7cd-4f28-b9db-0409bcc3d1ed.webp',
      badge: 'New Arrival',
      badgeTone: 'purple',
      price: 9050366,
      originalPrice: 10245722,
    },
    {
      title: 'Ultimate Gaming Set - Cyberpunk',
      image: '/home/GravaStar-Ultimate-Gaming-Set-Cyberpunk-Mercury-K1-Pro-Mercury-X-Pro-75-Compact-49g-Magnesium-2.webp',
      badge: 'Bestseller',
      badgeTone: 'purple',
      price: 8384800,
      originalPrice: 9393798,
    },
    {
      title: 'HE 8000Hz Ultra-Fast Hall Effect Set',
      image: '/home/2_37cf100d-5e30-4172-bd2b-15dd45495b55.webp',
      badge: 'Save Big',
      badgeTone: 'red',
      price: 9396460,
      originalPrice: 10778175,
    },
    {
      title: 'Ultimate Gaming Set - Interstellar Silver',
      image: '/home/GravaStar-Ultimate-Gaming-Set-Interstellar-Silver-Mercury-K1-Pro-Keyboard-Mercury-X-Pro-Mouse-RGB-75-Layout-49g-Magnesium.webp',
      badge: 'Hot Deal',
      badgeTone: 'red',
      price: 7958838,
      originalPrice: 8861345,
    },
  ];

  readonly featurePromo: PromoCard = {
    eyebrow: 'Discover Art In Technology',
    title: 'HandCraft Collection',
    description:
      'Limited edition pieces that blend advanced tech with collectible sci-fi industrial design.',
    image: '/home/wardamagedyellowfamily.webp',
    tone: 'dark',
    cta: 'Learn More',
  };

  readonly sidePromos: PromoCard[] = [
    {
      eyebrow: 'Special Offers',
      title: 'This Week’s Best Deals',
      description: 'Save more on top-tier gear bundles and starter desk setups.',
      image: '/home/Best_Desktop_Gaming_Setups_Ultimate_Gaming_Rigs_Best_Performance_Setups.webp',
      tone: 'dark',
      cta: 'Shop Now',
    },
    {
      eyebrow: 'Community',
      title: 'Join the Tech Vanguard',
      description: '42k+ members sharing custom builds, sound tests, and first-look drops.',
      tone: 'light',
    },
  ];

  readonly videoCards: VideoCard[] = [
    {
      title: 'This FUTURISTIC keyboard looks WILD...',
      creator: '@JampackSam',
      image: 'https://img.youtube.com/vi/SI000GQVeGY/maxresdefault.jpg',
      youtubeId: 'SI000GQVeGY',
    },
    {
      title: 'Is This the Coolest GPU Ever Made?',
      creator: '@METAPCs',
      image: 'https://img.youtube.com/vi/W9jSBZj5FIM/maxresdefault.jpg',
      youtubeId: 'W9jSBZj5FIM',
    },
    {
      title: 'This gaming mouse is technically 8x more responsive than yours...',
      creator: '@actuallycarterpcs',
      image: 'https://img.youtube.com/vi/w12OU_yuP-s/maxresdefault.jpg',
      youtubeId: 'w12OU_yuP-s',
    },
    {
      title: "Gravastar K1 Pro | It's not like the rest",
      creator: '@Unbox Analysis',
      image: 'https://img.youtube.com/vi/TsAkPhWX_g8/maxresdefault.jpg',
      youtubeId: 'TsAkPhWX_g8',
    },
    {
      title: 'Is the Gravastar V60 Pro Worth It?',
      creator: '@Peyton Toenjes Reviews',
      image: 'https://img.youtube.com/vi/Pu5yY8SEgi4/maxresdefault.jpg',
      youtubeId: 'Pu5yY8SEgi4',
    },
    {
      title: "GravaStar x Assassin's Creed Apple of Eden | Mars Pro Limited Edition",
      creator: '@GravaStar',
      image: 'https://img.youtube.com/vi/OtF3lUaZdUI/maxresdefault.jpg',
      youtubeId: 'OtF3lUaZdUI',
    },
  ];

  readonly testimonials: Testimonial[] = [
    {
      quote:
        'V75 Pro positions itself as a high-performance keyboard for gamers who prioritise precision, speed, and customisation.',
      source: 'Mighty Gadget',
      image: '/home/mighty-gadget.png',
    },
    {
      quote:
        'There’s a TWS (True Stereo Sound) mode, allowing you to connect two and playback audio with stereo fidelity.',
      source: 'Android Central',
      image: '/home/android-central.png',
    },
    {
      quote:
        'When gaming, the Mercury M1 Pro is reliably quick, with an incredibly stable, low-latency wireless connection.',
      source: 'Creative Bloq',
      image: '/home/creative-bloq.webp',
    },
    {
      quote:
        'The Alpha65 is a great grab and go desktop accessory that works as decor when not in use.',
      source: 'MacRumors',
      image: '/home/macrumors.webp',
    },
    {
      quote:
        'The Mars Pro is a totally unique, beautifully crafted accessory that will give you a planet’s worth of pride.',
      source: 'Digital Trends',
      image: '/home/digital-trends.webp',
    },
  ];

  readonly communityMembers: CommunityMember[] = [
    { name: 'Morgan', avatar: '/home/asset-10.webp' },
    { name: 'Avery', avatar: '/home/asset-8.webp' },
    { name: 'Kai', avatar: '/home/asset-1.webp' },
  ];

  readonly footerColumns = [
    {
      title: 'Support',
      links: ['Software Download', 'FAQ', 'Warranty', 'Shipping', 'Return Policy', 'Privacy'],
    },
    {
      title: 'About',
      links: ['About Us', 'Press', 'Blog', 'Contact'],
    },
    {
      title: 'Explore',
      links: ['Discord Community', 'Also Selling Here', 'Loyalty Page', 'Bundles'],
    },
  ];

  // --- AUTO-PLAY LOGIC (Đã tối ưu Clean Code) ---
  private readonly HERO_INTERVAL_MS = 6000;
  private readonly TESTIMONIAL_INTERVAL_MS = 4000;

  private heroIntervalId: ReturnType<typeof setInterval> | undefined;
  private testimonialIntervalId: ReturnType<typeof setInterval> | undefined;

  ngOnInit() {
    this.startHeroAutoPlay();
    this.startTestimonialAutoPlay();
  }

  ngOnDestroy() {
    this.stopHeroAutoPlay();
    this.stopTestimonialAutoPlay();
  }

  startHeroAutoPlay() {
    this.heroIntervalId = setInterval(() => this.nextHeroSlide(), this.HERO_INTERVAL_MS);
  }

  stopHeroAutoPlay() {
    if (this.heroIntervalId) clearInterval(this.heroIntervalId);
  }

  startTestimonialAutoPlay() {
    this.testimonialIntervalId = setInterval(
      () => this.nextTestimonial(),
      this.TESTIMONIAL_INTERVAL_MS,
    );
  }

  stopTestimonialAutoPlay() {
    if (this.testimonialIntervalId) clearInterval(this.testimonialIntervalId);
  }

  // --- NAV & CONTROLS ---
  onNavSelect(item: HeaderNavItem): void {
    this.activeNavLabel.set(item.label);
  }

  setHeroSlide(index: number): void {
    this.activeHeroSlide.set(index);
  }

  nextHeroSlide(): void {
    this.activeHeroSlide.update((index) => (index + 1) % this.heroSlides.length);
  }

  previousHeroSlide(): void {
    this.activeHeroSlide.update((index) => (index === 0 ? this.heroSlides.length - 1 : index - 1));
  }

  setTestimonial(index: number): void {
    this.activeTestimonial.set(index);
  }

  nextTestimonial(): void {
    this.activeTestimonial.update((index) => (index + 1) % this.testimonials.length);
  }

  previousTestimonial(): void {
    this.activeTestimonial.update((index) =>
      index === 0 ? this.testimonials.length - 1 : index - 1,
    );
  }

  openVideo(videoId: string): void {
    this.selectedVideoId.set(videoId);
  }

  closeVideo(): void {
    this.selectedVideoId.set(null);
  }

  getSafeVideoUrl(videoId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
    );
  }

  constructor() {
    effect(() => {
      const message = this.authSessionStore.logoutSuccessMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });

    effect(() => {
      const message = this.authSessionStore.logoutWarningMessage();

      if (message) {
        untracked(() => {
          this.toastService.warning(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });
  }

  onLogout(): void {
    this.authSessionStore.logout();
  }
}
