import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface SlideItem {
  src: string;
  alt: string;
}

interface ProductDeal {
  image: string;
  alt: string;
  badges: { text: string; variant: 'new' | 'sale' }[];
  name: string;
  price: string;
  originalPrice?: string;
}

interface Testimonial {
  quote: string;
  logo: string;
  logoAlt: string;
}

interface VideoReview {
  thumbnail: string;
  title: string;
  channel: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  /* ── Hero slider ─────────────────────────────── */
  slides: SlideItem[] = [
    { src: '/images/hero/slide-1.webp', alt: 'ZenTech Gaming Gear – HE Keyboard' },
    { src: '/images/hero/slide-2.webp', alt: 'Level Up 2026 – New Collection' },
  ];
  currentSlide = 0;
  private slideTimer: ReturnType<typeof setInterval> | null = null;

  /* ── Top Deals ───────────────────────────────── */
  deals: ProductDeal[] = [
    {
      image: '/images/products/deal-1.webp', alt: 'ZenTech V60 Pro & X Pro Bundle',
      badges: [{ text: 'New Arrival', variant: 'new' }, { text: 'Save $48', variant: 'sale' }],
      name: 'ZenTech V60 Pro & X Pro Gaming Set',
      price: '$362', originalPrice: '$410',
    },
    {
      image: '/images/products/deal-2.webp', alt: 'ZenTech Cyberpunk Set',
      badges: [{ text: 'Bestseller', variant: 'new' }, { text: 'Save $40', variant: 'sale' }],
      name: 'ZenTech Ultimate Gaming Set – Cyberpunk Edition',
      price: '$335', originalPrice: '$376',
    },
    {
      image: '/images/products/deal-3.webp', alt: 'ZenTech HE 8000Hz Set',
      badges: [{ text: 'Save $55', variant: 'sale' }],
      name: 'ZenTech HE 8000Hz Ultra-Fast Hall Effect Gaming Set',
      price: '$376', originalPrice: '$431',
    },
    {
      image: '/images/products/deal-4.webp', alt: 'ZenTech Interstellar Silver',
      badges: [{ text: 'Save $36', variant: 'sale' }],
      name: 'ZenTech Ultimate Gaming Set – Interstellar Silver',
      price: '$318', originalPrice: '$354',
    },
  ];

  /* ── Testimonials slider ─────────────────────── */
  testimonials: Testimonial[] = [
    {
      quote: 'V75 Pro positions itself as a high-performance keyboard for gamers who prioritise precision, speed, and customisation.',
      logo: '/images/press/logo-mighty-gadget.png', logoAlt: 'Mighty Gadget',
    },
    {
      quote: `The Mercury M1 Pro is hands down one of the most uniquely designed gaming mice I've ever tested.`,
      logo: '/images/press/logo-tech-radar.png', logoAlt: 'Tech Radar',
    },
    {
      quote: 'ZenTech is pushing the boundaries of what gaming peripherals should look like in the modern era.',
      logo: '/images/press/logo-ign.png', logoAlt: 'IGN',
    },
    {
      quote: 'Incredible build quality matched with top-tier Hall Effect sensors. A true game-changer.',
      logo: '/images/press/logo-pc-gamer.png', logoAlt: 'PC Gamer',
    },
    {
      quote: 'If you want your setup to look like a sci-fi movie set, ZenTech is the only brand you need.',
      logo: '/images/press/logo-dexerto.png', logoAlt: 'Dexerto',
    },
  ];
  currentTestimonial = 0;
  private testiTimer: ReturnType<typeof setInterval> | null = null;

  /* ── YouTube Video Reviews ──────────────────── */
  videoReviews: VideoReview[] = [
    {
      thumbnail: '/images/reviews/thumb-1.webp',
      title: 'This FUTURISTIC keyboard looks WILD...',
      channel: '@JampackSam',
    },
    {
      thumbnail: '/images/reviews/thumb-2.webp',
      title: 'Is This the Coolest GPU Ever Made?',
      channel: '@METAPCs',
    },
    {
      thumbnail: '/images/reviews/thumb-3.webp',
      title: 'This gaming mouse is technically 8x more responsive than yours...',
      channel: '@actuallycarterpcs',
    },
    {
      thumbnail: '/images/reviews/thumb-4.webp',
      title: 'GravaStar K1 Pro | It\'s not like the rest',
      channel: '@Unbox Analysis',
    },
    {
      thumbnail: '/images/reviews/thumb-5.webp',
      title: 'Is the ZenTech V60 Pro Worth It?',
      channel: '@Peyton Toenjes Reviews',
    },
    {
      thumbnail: '/images/reviews/thumb-6.webp',
      title: 'ZenTech x Assassin\'s Creed Apple of Eden | Mars Pro Limited Edition',
      channel: '@ZenTech',
    },
  ];

  /* ── Lifecycle ───────────────────────────────── */
  ngOnInit(): void {
    this.slideTimer = setInterval(() => this.nextSlide(), 5000);
    this.testiTimer = setInterval(() => this.nextTestimonial(), 4000);
  }

  ngOnDestroy(): void {
    if (this.slideTimer) clearInterval(this.slideTimer);
    if (this.testiTimer) clearInterval(this.testiTimer);
  }

  /* ── Hero slider controls ────────────────────── */
  goToSlide(index: number): void {
    this.currentSlide = index;
    this.resetSlideTimer();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.resetSlideTimer();
  }

  private resetSlideTimer(): void {
    if (this.slideTimer) clearInterval(this.slideTimer);
    this.slideTimer = setInterval(() => this.nextSlide(), 5000);
  }

  /* ── Testimonial controls ────────────────────── */
  goToTestimonial(index: number): void {
    this.currentTestimonial = index;
    this.resetTestiTimer();
  }

  nextTestimonial(): void {
    this.currentTestimonial = (this.currentTestimonial + 1) % this.testimonials.length;
  }

  prevTestimonial(): void {
    this.currentTestimonial = (this.currentTestimonial - 1 + this.testimonials.length) % this.testimonials.length;
    this.resetTestiTimer();
  }

  private resetTestiTimer(): void {
    if (this.testiTimer) clearInterval(this.testiTimer);
    this.testiTimer = setInterval(() => this.nextTestimonial(), 4000);
  }
}
