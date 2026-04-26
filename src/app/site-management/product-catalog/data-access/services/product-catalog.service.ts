import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  ProductCategory,
  ProductCategoryListing,
  ProductDetail,
  ProductListItem,
  ProductReview,
  ProductReviewPayload,
  ProductSpec,
} from '../models/product-catalog.models';

export const PRODUCT_CATEGORY_NOT_FOUND = 'PRODUCT_CATEGORY_NOT_FOUND';
export const PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND';

@Injectable({
  providedIn: 'root',
})
export class ProductCatalogService {
  private readonly reviewsByProductSlug = new Map<string, ProductReview[]>(
    Object.entries(MOCK_PRODUCT_DETAILS).map(([slug, product]) => [
      slug,
      product.reviews.map(review => ({ ...review })),
    ])
  );

  getCategoryListing(slug: string): Observable<ProductCategoryListing> {
    const listing = MOCK_PRODUCT_LISTINGS[slug];

    if (!listing) {
      return throwError(() => new Error(PRODUCT_CATEGORY_NOT_FOUND));
    }

    return of({
      category: { ...listing.category },
      products: listing.products.map(product => ({ ...product })),
    }).pipe(delay(220));
  }

  getProductDetail(productSlug: string): Observable<ProductDetail> {
    const product = MOCK_PRODUCT_DETAILS[productSlug];

    if (!product) {
      return throwError(() => new Error(PRODUCT_NOT_FOUND));
    }

    return of(this.cloneProductDetail(productSlug)).pipe(delay(220));
  }

  addProductReview(
    productSlug: string,
    payload: ProductReviewPayload
  ): Observable<ProductReview> {
    if (!MOCK_PRODUCT_DETAILS[productSlug]) {
      return throwError(() => new Error(PRODUCT_NOT_FOUND));
    }

    const review: ProductReview = {
      id: `review-${productSlug}-${Date.now()}`,
      reviewerName: payload.reviewerName?.trim() || 'ZenTech Customer',
      rating: payload.rating,
      title: payload.title.trim(),
      comment: payload.comment.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentReviews = this.reviewsByProductSlug.get(productSlug) ?? [];
    this.reviewsByProductSlug.set(productSlug, [review, ...currentReviews]);

    return of({ ...review }).pipe(delay(260));
  }

  getRelatedProducts(productSlugs: string[]): ProductListItem[] {
    return productSlugs
      .map(slug => MOCK_PRODUCT_DETAILS[slug])
      .filter((product): product is ProductDetail => !!product)
      .map(product => toListItem(product));
  }

  private cloneProductDetail(productSlug: string): ProductDetail {
    const product = MOCK_PRODUCT_DETAILS[productSlug];
    const reviews = this.reviewsByProductSlug.get(productSlug) ?? [];
    const reviewCount = reviews.length;
    const rating =
      reviewCount > 0
        ? Number(
            (reviews.reduce((total, review) => total + review.rating, 0) / reviewCount).toFixed(1)
          )
        : product.rating;

    return {
      ...product,
      category: { ...product.category },
      gallery: [...product.gallery],
      highlights: [...product.highlights],
      specs: product.specs.map(spec => ({ ...spec })),
      reviews: reviews.map(review => ({ ...review })),
      rating,
      reviewCount,
      relatedProductSlugs: [...product.relatedProductSlugs],
    };
  }
}

const CATEGORIES: Record<string, ProductCategory> = {
  keyboards: {
    slug: 'keyboards',
    label: 'Keyboards',
    subtitle: 'Precision instruments for tactile setups.',
    description:
      'Curated mechanical and HE keyboards for gamers, creators, and workstation builds that need speed, stability, and presence.',
    heroImage: '/home/asset-5.webp',
    heroEyebrow: 'ZenTech Collection',
  },
  mice: {
    slug: 'mice',
    label: 'Mice',
    subtitle: 'Rapid response for clutch precision.',
    description:
      'Lightweight, high-polling, and competition-tuned mice built to stay stable across long sessions and high-speed flicks.',
    heroImage: '/home/asset-7.webp',
    heroEyebrow: 'Performance Line',
  },
  speakers: {
    slug: 'speakers',
    label: 'Speakers',
    subtitle: 'Acoustic purity with desktop scale.',
    description:
      'Near-field desktop speakers and compact sound systems with clean tuning, low distortion, and balanced low-end.',
    heroImage: '/home/asset-6.webp',
    heroEyebrow: 'Studio Audio',
  },
  earbuds: {
    slug: 'earbuds',
    label: 'Earbuds',
    subtitle: 'Sonic freedom for travel and focus.',
    description:
      'Noise-cancelling earbuds and portable audio gear designed for all-day wear, crisp calls, and immersive playback.',
    heroImage: '/home/asset-2.webp',
    heroEyebrow: 'Portable Audio',
  },
  chargers: {
    slug: 'chargers',
    label: 'Chargers',
    subtitle: 'Power delivery without clutter.',
    description:
      'GaN chargers and fast-charge accessories tuned for modern desks, travel kits, and multi-device workflows.',
    heroImage: '/home/asset-3.webp',
    heroEyebrow: 'Power Essentials',
  },
  accessories: {
    slug: 'accessories',
    label: 'Accessories',
    subtitle: 'Desk details coming together soon.',
    description:
      'Wrist rests, sleeves, cables, and desk extras are being curated. This category is live, but the first drop has not landed yet.',
    heroImage: '/home/asset-9.webp',
    heroEyebrow: 'Next Drop',
  },
};

const MOCK_PRODUCT_DETAILS: Record<string, ProductDetail> = {
  'mercury-v60-pro': createProductDetail(
    'mercury-v60-pro',
    CATEGORIES['keyboards'],
    'Mercury V60 Pro',
    '/home/asset-5.webp',
    129,
    {
      originalPrice: 149,
      badge: 'Top Seller',
      badgeTone: 'red',
      rating: 4.9,
      reviewCount: 214,
      gallery: ['/home/asset-5.webp', '/home/asset-9.webp', '/home/asset-4.webp'],
      description:
        'A compact HE keyboard tuned for fast actuation, clean acoustics, and a desk presence that feels unmistakably ZenTech.',
      highlights: ['Rapid trigger HE switches', 'CNC aluminum top frame', 'Tri-mode wireless', 'Hot-swap stabilizer tuning'],
      specs: [
        spec('Layout', '60% compact'),
        spec('Switch', 'ZenTech HE magnetic'),
        spec('Connection', 'USB-C, 2.4 GHz, Bluetooth'),
        spec('Battery', '4200 mAh'),
      ],
      reviews: [
        review('Avery Nguyen', 5, 'Fast, clean, and ridiculously solid', 'The rapid trigger tuning feels instant without making normal typing annoying.'),
        review('Minh Tran', 5, 'Great finish', 'The aluminum case and stock sound are much better than I expected.'),
      ],
      relatedProductSlugs: ['nova-tkl-he', 'atlas-75-wireless', 'lumen-office-98'],
    }
  ),
  'nova-tkl-he': createProductDetail('nova-tkl-he', CATEGORIES['keyboards'], 'Nova TKL HE', '/home/asset-9.webp', 169, {
    originalPrice: 189,
    badge: 'HE Switch',
    badgeTone: 'purple',
    rating: 4.8,
    reviewCount: 186,
    gallery: ['/home/asset-9.webp', '/home/asset-5.webp', '/home/asset-7.webp'],
    description: 'A tenkeyless magnetic keyboard with a larger control surface for competitive play and creator shortcuts.',
    highlights: ['Adjustable actuation', 'Double-shot PBT keycaps', 'Gasket isolation', 'Onboard profile memory'],
    specs: [spec('Layout', 'TKL'), spec('Polling', '8K wired'), spec('Material', 'Aluminum + PC plate'), spec('Weight', '920 g')],
    reviews: [review('Khoa Le', 5, 'Perfect TKL size', 'Enough room for mouse movement while keeping navigation keys.')],
    relatedProductSlugs: ['mercury-v60-pro', 'atlas-75-wireless', 'aero-x1'],
  }),
  'atlas-75-wireless': createProductDetail('atlas-75-wireless', CATEGORIES['keyboards'], 'Atlas 75 Wireless', '/home/asset-7.webp', 149, {
    badge: 'Wireless',
    badgeTone: 'amber',
    rating: 4.7,
    reviewCount: 97,
    gallery: ['/home/asset-7.webp', '/home/asset-5.webp', '/home/asset-1.webp'],
    description: 'A balanced 75% keyboard built for daily switching between laptop, tablet, and desktop setups.',
    highlights: ['75% navigation cluster', 'Soft tactile switches', 'Multi-device pairing', 'Mac and Windows legends'],
    specs: [spec('Layout', '75%'), spec('Battery', '5000 mAh'), spec('Switch', 'Zen tactile'), spec('Connection', 'USB-C, Bluetooth')],
    reviews: [review('Nhi Pham', 4, 'Very easy daily board', 'The wireless switching is smooth and the size is just right.')],
    relatedProductSlugs: ['mercury-v60-pro', 'lumen-office-98', 'vector-pro'],
  }),
  'lumen-office-98': createProductDetail('lumen-office-98', CATEGORIES['keyboards'], 'Lumen Office 98', '/home/asset-4.webp', 119, {
    originalPrice: 139,
    rating: 4.6,
    reviewCount: 73,
    gallery: ['/home/asset-4.webp', '/home/asset-5.webp', '/home/asset-3.webp'],
    description: 'A quiet productivity keyboard with a compact numpad and subtle lighting for long work sessions.',
    highlights: ['Compact numpad', 'Dampened case foam', 'Low-glare backlight', 'Quiet linear switches'],
    specs: [spec('Layout', '98-key'), spec('Switch', 'Quiet linear'), spec('Connection', 'USB-C'), spec('Profile', 'Low front height')],
    reviews: [review('Bao Vo', 4, 'Office friendly', 'Quiet enough for calls and still feels premium.')],
    relatedProductSlugs: ['atlas-75-wireless', 'fold-plug-65', 'zen-track'],
  }),
  'aero-x1': createProductDetail('aero-x1', CATEGORIES['mice'], 'Aero X1 Wireless', '/home/asset-7.webp', 89, {
    originalPrice: 99,
    badge: '2.4 GHz',
    badgeTone: 'purple',
    rating: 4.8,
    reviewCount: 146,
    gallery: ['/home/asset-7.webp', '/home/asset-8.webp', '/home/asset-10.webp'],
    description: 'A lightweight wireless mouse with stable tracking and a shape made for long aim sessions.',
    highlights: ['54 g shell', '26K optical sensor', 'Low-latency wireless', 'PTFE feet'],
    specs: [spec('Weight', '54 g'), spec('Sensor', '26K DPI'), spec('Polling', '1K wireless'), spec('Battery', '80 hours')],
    reviews: [review('Duc Hoang', 5, 'Very stable sensor', 'Clicks feel crisp and tracking stays locked in.')],
    relatedProductSlugs: ['pulse-mini', 'vector-pro', 'nova-tkl-he'],
  }),
  'pulse-mini': createProductDetail('pulse-mini', CATEGORIES['mice'], 'Pulse Mini', '/home/asset-8.webp', 69, {
    badge: 'Ultra Light',
    badgeTone: 'red',
    rating: 4.7,
    reviewCount: 88,
    gallery: ['/home/asset-8.webp', '/home/asset-7.webp', '/home/asset-1.webp'],
    description: 'A smaller performance mouse for fingertip and claw grips, tuned for quick resets.',
    highlights: ['Small shell', 'Crisp main clicks', 'Flexible cable', 'Textured side grip'],
    specs: [spec('Weight', '49 g'), spec('Grip', 'Claw / fingertip'), spec('Sensor', '20K DPI'), spec('Connection', 'USB-C')],
    reviews: [review('Lan Anh', 5, 'Small hands finally win', 'The size is excellent and it does not feel hollow.')],
    relatedProductSlugs: ['aero-x1', 'vector-pro', 'drift-air'],
  }),
  'vector-pro': createProductDetail('vector-pro', CATEGORIES['mice'], 'Vector Pro', '/home/asset-10.webp', 109, {
    originalPrice: 129,
    rating: 4.9,
    reviewCount: 121,
    gallery: ['/home/asset-10.webp', '/home/asset-7.webp', '/home/asset-8.webp'],
    description: 'A pro-grade ergonomic mouse with a high-control shell and fast wireless response.',
    highlights: ['Ergo shape', '8 programmable inputs', 'Magnetic charging dock', 'Glass-ready sensor'],
    specs: [spec('Weight', '62 g'), spec('Buttons', '8'), spec('Connection', '2.4 GHz'), spec('Dock', 'Magnetic pogo-pin')],
    reviews: [review('Quang Dinh', 5, 'Excellent shape', 'Comfortable without feeling bulky.')],
    relatedProductSlugs: ['aero-x1', 'pulse-mini', 'atlas-75-wireless'],
  }),
  'zen-track': createProductDetail('zen-track', CATEGORIES['mice'], 'Zen Track Ergo', '/home/asset-1.webp', 79, {
    rating: 4.5,
    reviewCount: 53,
    inStock: false,
    gallery: ['/home/asset-1.webp', '/home/asset-7.webp', '/home/asset-10.webp'],
    description: 'A calm ergonomic mouse for productivity setups with a soft-touch shell.',
    highlights: ['Ergonomic tilt', 'Silent buttons', 'Multi-device pairing', 'Long battery life'],
    specs: [spec('Connection', 'Bluetooth / USB receiver'), spec('Buttons', '6'), spec('Battery', '120 days'), spec('Finish', 'Soft touch')],
    reviews: [review('Mai Do', 4, 'Comfortable for work', 'The hand angle is easy to adjust to.')],
    relatedProductSlugs: ['vector-pro', 'lumen-office-98', 'fold-plug-65'],
  }),
  'sonic-frame': createProductDetail('sonic-frame', CATEGORIES['speakers'], 'Sonic Frame Duo', '/home/asset-6.webp', 199, {
    originalPrice: 229,
    badge: 'Pair',
    badgeTone: 'amber',
    rating: 4.8,
    reviewCount: 64,
    gallery: ['/home/asset-6.webp', '/home/asset-2.webp', '/home/asset-3.webp'],
    description: 'A compact speaker pair tuned for near-field detail and rich desk audio.',
    highlights: ['Near-field imaging', 'USB-C audio', 'Sub-out support', 'Aluminum volume dial'],
    specs: [spec('Output', '60 W'), spec('Inputs', 'USB-C, AUX, Bluetooth'), spec('Driver', '3-inch full range'), spec('Pairing', 'Stereo pair')],
    reviews: [review('Tuan Bui', 5, 'Clean desk audio', 'Clear vocals and enough low-end for a desk.')],
    relatedProductSlugs: ['echo-pod', 'zen-woofer', 'vortex-studio-anc'],
  }),
  'echo-pod': createProductDetail('echo-pod', CATEGORIES['speakers'], 'Echo Pod Mini', '/home/asset-2.webp', 119, {
    badge: 'Compact',
    badgeTone: 'purple',
    rating: 4.6,
    reviewCount: 41,
    gallery: ['/home/asset-2.webp', '/home/asset-6.webp', '/home/asset-8.webp'],
    description: 'A tiny speaker with surprisingly full sound for small desks and dorm rooms.',
    highlights: ['Compact footprint', 'Bluetooth 5.3', 'Passive radiator', 'USB-C powered'],
    specs: [spec('Output', '25 W'), spec('Input', 'Bluetooth / USB-C'), spec('Height', '118 mm'), spec('Mode', 'Single or stereo pair')],
    reviews: [review('Huy Nguyen', 4, 'Small but useful', 'Good for a laptop desk setup.')],
    relatedProductSlugs: ['sonic-frame', 'drift-air', 'ion-core-120'],
  }),
  'zen-woofer': createProductDetail('zen-woofer', CATEGORIES['speakers'], 'Zen Woofer Hub', '/home/asset-3.webp', 159, {
    rating: 4.7,
    reviewCount: 58,
    gallery: ['/home/asset-3.webp', '/home/asset-6.webp', '/home/asset-2.webp'],
    description: 'A low-profile sub hub that adds weight to compact speaker setups.',
    highlights: ['Low-profile cabinet', 'Desk EQ presets', 'USB hub passthrough', 'Sub-out chaining'],
    specs: [spec('Output', '80 W'), spec('Driver', '5.25-inch woofer'), spec('Inputs', 'USB-C, AUX'), spec('Extras', '2-port USB hub')],
    reviews: [review('Nam Phan', 4, 'Adds real body', 'Great match with compact speakers.')],
    relatedProductSlugs: ['sonic-frame', 'echo-pod', 'zen-dock-gan'],
  }),
  'vortex-studio-anc': createProductDetail('vortex-studio-anc', CATEGORIES['earbuds'], 'Vortex Studio ANC', '/home/asset-2.webp', 249, {
    originalPrice: 299,
    badge: 'Save $50',
    badgeTone: 'red',
    rating: 4.9,
    reviewCount: 132,
    gallery: ['/home/asset-2.webp', '/home/asset-8.webp', '/home/asset-10.webp'],
    description: 'A premium ANC earbud built for focused work, travel, and clean calls.',
    highlights: ['Adaptive ANC', 'Dual-driver tuning', 'Six-mic calls', 'Wireless charging case'],
    specs: [spec('Battery', '8 + 28 hours'), spec('ANC', 'Adaptive hybrid'), spec('Codec', 'AAC / LDAC'), spec('Water resistance', 'IPX5')],
    reviews: [review('Trang Nguyen', 5, 'ANC is impressive', 'Great on flights and the case feels premium.')],
    relatedProductSlugs: ['drift-air', 'nova-buds-pro', 'sonic-frame'],
  }),
  'drift-air': createProductDetail('drift-air', CATEGORIES['earbuds'], 'Drift Air Lite', '/home/asset-8.webp', 99, {
    badge: 'Daily Use',
    badgeTone: 'amber',
    rating: 4.5,
    reviewCount: 77,
    gallery: ['/home/asset-8.webp', '/home/asset-2.webp', '/home/asset-10.webp'],
    description: 'Lightweight everyday earbuds with a comfortable fit and balanced battery life.',
    highlights: ['Lightweight fit', 'Quick pairing', 'Clear voice mode', 'Pocket case'],
    specs: [spec('Battery', '7 + 21 hours'), spec('Codec', 'AAC'), spec('Water resistance', 'IPX4'), spec('Weight', '4.2 g per bud')],
    reviews: [review('Vy Le', 4, 'Good daily pair', 'Comfortable enough for long work blocks.')],
    relatedProductSlugs: ['vortex-studio-anc', 'nova-buds-pro', 'pulse-mini'],
  }),
  'nova-buds-pro': createProductDetail('nova-buds-pro', CATEGORIES['earbuds'], 'Nova Buds Pro', '/home/asset-10.webp', 139, {
    originalPrice: 159,
    rating: 4.7,
    reviewCount: 96,
    gallery: ['/home/asset-10.webp', '/home/asset-2.webp', '/home/asset-8.webp'],
    description: 'A strong midrange earbud with punchy sound and a clean app-free control scheme.',
    highlights: ['Dynamic EQ', 'Touch controls', 'Low latency mode', 'Wireless charging'],
    specs: [spec('Battery', '8 + 24 hours'), spec('Codec', 'AAC / SBC'), spec('Latency', '85 ms mode'), spec('Case', 'Wireless charge')],
    reviews: [review('Long Vu', 5, 'Excellent value', 'Sound is full and the controls are reliable.')],
    relatedProductSlugs: ['vortex-studio-anc', 'drift-air', 'echo-pod'],
  }),
  'ion-core-120': createProductDetail('ion-core-120', CATEGORIES['chargers'], 'Ion Core 120W Max', '/home/asset-3.webp', 67, {
    originalPrice: 79,
    badge: 'Save 15%',
    badgeTone: 'red',
    rating: 4.8,
    reviewCount: 84,
    gallery: ['/home/asset-3.webp', '/home/asset-4.webp', '/home/asset-1.webp'],
    description: 'A compact GaN charger that can power laptop, tablet, and phone from one travel block.',
    highlights: ['120 W total output', 'Triple USB-C', 'GaN thermal control', 'Foldable plug'],
    specs: [spec('Output', '120 W'), spec('Ports', '3 USB-C + USB-A'), spec('Material', 'Fire-retardant shell'), spec('Protocol', 'PD 3.1 / PPS')],
    reviews: [review('Phuc Le', 5, 'One charger for everything', 'Runs cool and charges my laptop without complaint.')],
    relatedProductSlugs: ['fold-plug-65', 'zen-dock-gan', 'lumen-office-98'],
  }),
  'fold-plug-65': createProductDetail('fold-plug-65', CATEGORIES['chargers'], 'Fold Plug 65', '/home/asset-4.webp', 49, {
    badge: 'Travel',
    badgeTone: 'purple',
    rating: 4.6,
    reviewCount: 39,
    gallery: ['/home/asset-4.webp', '/home/asset-3.webp', '/home/asset-1.webp'],
    description: 'A pocketable fast charger for daily carry and short trips.',
    highlights: ['65 W USB-C', 'Foldable pins', 'Compact GaN body', 'Phone + laptop split'],
    specs: [spec('Output', '65 W'), spec('Ports', '2 USB-C'), spec('Weight', '108 g'), spec('Protocol', 'PD / PPS')],
    reviews: [review('Son Dang', 4, 'Tiny laptop charger', 'Much easier to carry than my original brick.')],
    relatedProductSlugs: ['ion-core-120', 'zen-dock-gan', 'zen-track'],
  }),
  'zen-dock-gan': createProductDetail('zen-dock-gan', CATEGORIES['chargers'], 'Zen Dock GaN', '/home/asset-1.webp', 89, {
    rating: 4.7,
    reviewCount: 51,
    gallery: ['/home/asset-1.webp', '/home/asset-3.webp', '/home/asset-4.webp'],
    description: 'A desktop power dock for cable-light workstations and multi-device charging.',
    highlights: ['Angled desktop dock', '100 W upstream', 'Cable channel', 'LED power readout'],
    specs: [spec('Output', '100 W'), spec('Ports', '4 USB-C + 2 USB-A'), spec('Display', 'Power readout'), spec('Cable', '1.5 m braided')],
    reviews: [review('Kien Ho', 5, 'Desk looks cleaner', 'Great having power visible and reachable.')],
    relatedProductSlugs: ['ion-core-120', 'fold-plug-65', 'zen-woofer'],
  }),
};

const MOCK_PRODUCT_LISTINGS: Record<string, ProductCategoryListing> = Object.values(CATEGORIES).reduce(
  (listings, category) => ({
    ...listings,
    [category.slug]: {
      category,
      products: Object.values(MOCK_PRODUCT_DETAILS)
        .filter(product => product.categorySlug === category.slug)
        .map(product => toListItem(product)),
    },
  }),
  {} as Record<string, ProductCategoryListing>
);

function createProductDetail(
  slug: string,
  category: ProductCategory,
  name: string,
  image: string,
  price: number,
  options: {
    originalPrice?: number;
    badge?: string;
    badgeTone?: 'red' | 'purple' | 'amber';
    rating: number;
    reviewCount: number;
    inStock?: boolean;
    gallery: string[];
    description: string;
    highlights: string[];
    specs: ProductSpec[];
    reviews: ProductReview[];
    relatedProductSlugs: string[];
  }
): ProductDetail {
  return {
    id: slug,
    categorySlug: category.slug,
    slug,
    name,
    image,
    price,
    originalPrice: options.originalPrice,
    badge: options.badge,
    badgeTone: options.badgeTone,
    rating: options.rating,
    reviewCount: options.reviewCount,
    inStock: options.inStock ?? true,
    category,
    gallery: options.gallery,
    description: options.description,
    highlights: options.highlights,
    specs: options.specs,
    maxQuantity: options.inStock === false ? 0 : 5,
    reviews: options.reviews,
    relatedProductSlugs: options.relatedProductSlugs,
  };
}

function toListItem(product: ProductDetail): ProductListItem {
  return {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    image: product.image,
    price: product.price,
    originalPrice: product.originalPrice,
    badge: product.badge,
    badgeTone: product.badgeTone,
    rating: product.rating,
    reviewCount: product.reviewCount,
    inStock: product.inStock,
  };
}

function spec(label: string, value: string): ProductSpec {
  return { label, value };
}

function review(
  reviewerName: string,
  rating: number,
  title: string,
  comment: string
): ProductReview {
  return {
    id: `${reviewerName.toLowerCase().replace(/\s+/g, '-')}-${rating}`,
    reviewerName,
    rating,
    title,
    comment,
    createdAt: '2026-04-20T09:00:00.000Z',
  };
}
