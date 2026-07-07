import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, signal, untracked, OnInit, OnDestroy, HostListener } from '@angular/core';
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
  readonly parallaxX = signal(0);
  readonly parallaxY = signal(0);

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (typeof window !== 'undefined') {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const normalizedX = (event.clientX - centerX) / centerX;
      const normalizedY = (event.clientY - centerY) / centerY;
      this.parallaxX.set(normalizedX * 16);
      this.parallaxY.set(normalizedY * 16);
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.parallaxX.set(0);
    this.parallaxY.set(0);
  }

  readonly announcementMessages = [
    'Một đẳng cấp mới. Một vũ trụ mới. Bàn phím V60 Pro HE mới cập bến',
    'Tần số quét 8K. Công tắc từ tính. Thiết kế riêng cho game thủ chuyên nghiệp',
    'Cực nhiều ưu đãi hấp dẫn cho bàn phím, chuột và tai nghe Gaming',
    'Miễn phí vận chuyển cho tất cả các combo Gaming nổi bật tuần này',
    'Đăng ký thành viên để nhận voucher độc quyền và đặc quyền mua sớm',
    'Nâng tầm góc máy chiến game của bạn cùng các sản phẩm ZenTech',
  ];

  readonly heroSlides: HeroSlide[] = [
    {
      eyebrow: 'Sản phẩm mới 2026',
      title: 'Mercury K98 Pro',
      description:
        'Giữ trọn vẹn cụm phím số, mở khóa độ chính xác 8K kép và mang trạm chỉ huy viễn tưởng đầy đủ lên bàn làm việc của bạn.',
      image: '/home/mercury-k98-pro-mechaniccal-gaming-keyboard-1002.webp',
      primaryCta: 'Mua Ngay',
      secondaryCta: 'Khám Phá Phím',
    },
    {
      eyebrow: 'Đặc quyền Đặt Trước',
      title: 'Nhận ngay 2 Gear Cyber Miễn Phí',
      description:
        'Hoàn thiện bộ trang bị của bạn với quà tặng ra mắt số lượng giới hạn, phụ kiện bàn làm việc viễn tưởng và một góc setup ZenTech cực ngầu.',
      image: '/home/20260501-164934.webp',
      primaryCta: 'Đặt Hàng Ngay',
      secondaryCta: 'Xem Ưu Đãi',
    },
  ];

  readonly heroStats: StatItem[] = [
    { label: 'Độ trễ', value: '8K Hz' },
    { label: 'Công tắc', value: 'Từ Tính HE' },
    { label: 'Khung vỏ', value: 'CNC Hợp Kim' },
  ];

  readonly categories: CategoryCard[] = [
    {
      slug: 'keyboards',
      title: 'Bàn Phím Gaming',
      subtitle: 'Từ tính / Cơ học',
      image: '/home/1_8903b6a7-cea7-481d-ac1b-31d5ac7950ad.webp',
      size: 'large',
    },
    {
      slug: 'mice',
      title: 'Chuột Gaming',
      subtitle: 'Độ chính xác 8K không dây',
      image: '/home/6_eae6f3cd-3b4c-4fb7-b615-621e2fb41b13.webp',
      size: 'small',
    },
    {
      slug: 'chargers',
      title: 'Củ Sạc Robot',
      subtitle: 'Nguồn sạc nhanh',
      image:
        '/home/Gan-fast-charger-65w-power-adapter-gravastar-alpha65-robot-charger-blue-14.webp',
      size: 'small',
    },
    {
      slug: 'earbuds',
      title: 'Tai Nghe Gaming',
      subtitle: 'Âm thanh chất lượng cao',
      image: '/home/Anc-earbuds-noise-cancelling-headphones-gravastar-sirius-plus-black-5.jpg',
      size: 'small',
    },
    {
      slug: 'speakers',
      title: 'Loa Bluetooth',
      subtitle: 'Quái thú âm thanh để bàn',
      image: '/home/382db98bc3940982e4a12468e7fd68ae_739b6dc5-6abf-489c-9ee8-40a8c4249053.webp',
      size: 'large',
    },
  ];

  readonly flashSaleEndsAt = '04:22:15';

  readonly flashSales: ProductCard[] = [
    {
      title: 'GravaStar V60 Pro & X Pro Gaming Set',
      image: '/home/gravastar-v60-pro-8khz-magnetic-switch-gaming-keyboard-1001_ad8079ca-c7cd-4f28-b9db-0409bcc3d1ed.webp',
      badge: 'Hàng Mới',
      badgeTone: 'purple',
      price: 9050366,
      originalPrice: 10245722,
    },
    {
      title: 'Ultimate Gaming Set - Cyberpunk',
      image: '/home/GravaStar-Ultimate-Gaming-Set-Cyberpunk-Mercury-K1-Pro-Mercury-X-Pro-75-Compact-49g-Magnesium-2.webp',
      badge: 'Bán Chạy',
      badgeTone: 'purple',
      price: 8384800,
      originalPrice: 9393798,
    },
    {
      title: 'HE 8000Hz Ultra-Fast Hall Effect Set',
      image: '/home/2_37cf100d-5e30-4172-bd2b-15dd45495b55.webp',
      badge: 'Giảm Sâu',
      badgeTone: 'red',
      price: 9396460,
      originalPrice: 10778175,
    },
    {
      title: 'Ultimate Gaming Set - Interstellar Silver',
      image: '/home/GravaStar-Ultimate-Gaming-Set-Interstellar-Silver-Mercury-K1-Pro-Keyboard-Mercury-X-Pro-Mouse-RGB-75-Layout-49g-Magnesium.webp',
      badge: 'Giá Hời',
      badgeTone: 'red',
      price: 7958838,
      originalPrice: 8861345,
    },
  ];

  readonly featurePromo: PromoCard = {
    eyebrow: 'Khám phá Nghệ thuật trong Công nghệ',
    title: 'Bộ sưu tập Thủ công',
    description:
      'Những tác phẩm phiên bản giới hạn kết hợp công nghệ tiên tiến với thiết kế công nghiệp viễn tưởng đầy nghệ thuật.',
    image: '/home/wardamagedyellowfamily.webp',
    tone: 'dark',
    cta: 'Tìm hiểu thêm',
  };

  readonly sidePromos: PromoCard[] = [
    {
      eyebrow: 'Khuyến mãi đặc biệt',
      title: 'Ưu đãi tốt nhất tuần này',
      description: 'Tiết kiệm nhiều hơn với các gói thiết bị cao cấp và bộ setup bàn làm việc lý tưởng.',
      image: '/home/Best_Desktop_Gaming_Setups_Ultimate_Gaming_Rigs_Best_Performance_Setups.webp',
      tone: 'dark',
      cta: 'Mua ngay',
    },
    {
      eyebrow: 'Cộng đồng',
      title: 'Gia nhập Biệt đội Công nghệ',
      description: 'Hơn 42k thành viên cùng chia sẻ góc máy tùy biến, test âm phím và nhận thông tin hàng mới sớm nhất.',
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
        'V75 Pro định vị bản thân là dòng bàn phím hiệu năng cao dành cho các game thủ ưu tiên độ chính xác, tốc độ và khả năng tùy biến.',
      source: 'Mighty Gadget',
      image: '/home/mighty-gadget.png',
    },
    {
      quote:
        'Sản phẩm hỗ trợ chế độ kết nối TWS (True Wireless Stereo), cho phép liên kết 2 loa cùng lúc để phát âm thanh nổi trung thực.',
      source: 'Android Central',
      image: '/home/android-central.png',
    },
    {
      quote:
        'Khi chiến game, chuột Mercury M1 Pro phản hồi cực nhanh với kết nối không dây siêu ổn định cùng độ trễ cực thấp.',
      source: 'Creative Bloq',
      image: '/home/creative-bloq.webp',
    },
    {
      quote:
        'Alpha65 là một phụ kiện để bàn tuyệt vời, vừa sạc nhanh vừa dùng như một mô hình trang trí robot cực chất khi không sử dụng.',
      source: 'MacRumors',
      image: '/home/macrumors.webp',
    },
    {
      quote:
        'Mars Pro là một kiệt tác loa hoàn toàn độc đáo và được chế tác tinh xảo, là niềm tự hào cho bất kỳ góc máy nào sở hữu.',
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
      title: 'Hỗ trợ',
      links: ['Tải Phần Mềm', 'Câu Hỏi Thường Gặp', 'Chính Sách Bảo Hành', 'Chính Sách Giao Hàng', 'Chính Sách Đổi Trả', 'Quyền Riêng Tư'],
    },
    {
      title: 'Giới thiệu',
      links: ['Về Chúng Tôi', 'Báo Chí', 'Trang Tin Tức', 'Liên Hệ'],
    },
    {
      title: 'Khám phá',
      links: ['Cộng Đồng Discord', 'Các Đại Lý Ủy Quyền', 'Khách Hàng Thân Thiết', 'Combo Ưu Đãi'],
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
