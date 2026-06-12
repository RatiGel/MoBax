export type CategorySlug =
  // ── parents ──
  | 'phone-protection'
  | 'chargers'
  | 'headphones-speakers'
  | 'car-accessories'
  | 'computer-accessories'
  | 'original'
  // ── phone-protection ──
  | 'screen-shields'
  | 'protection-films'
  | 'phone-cases'
  // ── chargers ──
  | 'adapters'
  | 'cables'
  | 'charger-complect'
  // ── headphones-speakers ──
  | 'wireless-headphones'
  | 'wired-headphones'
  | 'bluetooth-speakers'
  | 'aux-converters'
  // ── car-accessories ──
  | 'phone-holders'
  | 'modulators'
  | 'car-chargers'
  // ── computer-accessories ──
  | 'keyboards'
  | 'mouse'
  | 'usb-flash-drives'
  // ── original ──
  | 'apple'
  | 'samsung'
  | 'google';

export interface Category {
  id: string;
  slug: CategorySlug;
  nameEn: string;
  nameKa: string;
  icon: string;
  image: string;
  parentSlug?: CategorySlug;
  productCount: number;
}

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  price: number;
  originalPrice?: number;
  category: CategorySlug;
  brand: string;
  images: string[];
  inStock: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  rating: number;
  reviewCount: number;
  specs: Record<string, string>;
  sku: string;
}

export const categories: Category[] = [
  // ── Parent categories ──────────────────────────────────────
  {
    id: 'p1', slug: 'phone-protection',
    nameEn: 'Phone Protection', nameKa: 'ტელეფონის დაცვა',
    icon: '🛡️',
    image: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400&h=300&fit=crop',
    productCount: 96,
  },
  {
    id: 'p2', slug: 'chargers',
    nameEn: 'Chargers', nameKa: 'დამტენები',
    icon: '⚡',
    image: 'https://images.unsplash.com/photo-1609592861685-f600d88c9b4f?w=400&h=300&fit=crop',
    productCount: 54,
  },
  {
    id: 'p3', slug: 'headphones-speakers',
    nameEn: 'Headphones & Speakers', nameKa: 'ყურსასმენები და დინამიკები',
    icon: '🎧',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    productCount: 42,
  },
  {
    id: 'p4', slug: 'car-accessories',
    nameEn: 'Car Accessories', nameKa: 'ავტო აქსესუარები',
    icon: '🚗',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
    productCount: 36,
  },
  {
    id: 'p5', slug: 'computer-accessories',
    nameEn: 'Computer Accessories', nameKa: 'კომპიუტერის აქსესუარები',
    icon: '💻',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop',
    productCount: 28,
  },
  {
    id: 'p6', slug: 'original',
    nameEn: '100% Original', nameKa: '100% ორიგინალი',
    icon: '✨',
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400&h=300&fit=crop',
    productCount: 20,
  },

  // ── Phone Protection ───────────────────────────────────────
  {
    id: 'c1', slug: 'screen-shields',
    nameEn: 'Screen Shields', nameKa: 'ეკრანის დამცავები',
    icon: '🪟', image: '', parentSlug: 'phone-protection', productCount: 30,
  },
  {
    id: 'c2', slug: 'protection-films',
    nameEn: 'Protection Films', nameKa: 'დამცავი ფილმები',
    icon: '📄', image: '', parentSlug: 'phone-protection', productCount: 22,
  },
  {
    id: 'c3', slug: 'phone-cases',
    nameEn: 'Phone Cases', nameKa: 'ქეისები',
    icon: '📱', image: '', parentSlug: 'phone-protection', productCount: 44,
  },

  // ── Chargers ───────────────────────────────────────────────
  {
    id: 'c4', slug: 'adapters',
    nameEn: 'Adapters', nameKa: 'ადაპტერები',
    icon: '🔌', image: '', parentSlug: 'chargers', productCount: 18,
  },
  {
    id: 'c5', slug: 'cables',
    nameEn: 'Cables', nameKa: 'კაბელები',
    icon: '🔗', image: '', parentSlug: 'chargers', productCount: 24,
  },
  {
    id: 'c6', slug: 'charger-complect',
    nameEn: 'Charger Complect', nameKa: 'დამტენის კომპლექტი',
    icon: '🧩', image: '', parentSlug: 'chargers', productCount: 12,
  },

  // ── Headphones & Speakers ──────────────────────────────────
  {
    id: 'c7', slug: 'wireless-headphones',
    nameEn: 'Wireless Headphones', nameKa: 'უსადენო ყურსასმენები',
    icon: '🎧', image: '', parentSlug: 'headphones-speakers', productCount: 16,
  },
  {
    id: 'c8', slug: 'wired-headphones',
    nameEn: 'Wired Headphones', nameKa: 'სადენიანი ყურსასმენები',
    icon: '🎵', image: '', parentSlug: 'headphones-speakers', productCount: 10,
  },
  {
    id: 'c9', slug: 'bluetooth-speakers',
    nameEn: 'Bluetooth Speakers', nameKa: 'ბლუთუზ დინამიკები',
    icon: '🔊', image: '', parentSlug: 'headphones-speakers', productCount: 12,
  },
  {
    id: 'c10', slug: 'aux-converters',
    nameEn: 'AUX & Converters', nameKa: 'AUX და კონვერტერები',
    icon: '🔀', image: '', parentSlug: 'headphones-speakers', productCount: 8,
  },

  // ── Car Accessories ────────────────────────────────────────
  {
    id: 'c11', slug: 'phone-holders',
    nameEn: 'Phone Holders', nameKa: 'ტელეფონის სამაგრი',
    icon: '📌', image: '', parentSlug: 'car-accessories', productCount: 14,
  },
  {
    id: 'c12', slug: 'modulators',
    nameEn: 'Modulators', nameKa: 'მოდულატორები',
    icon: '📻', image: '', parentSlug: 'car-accessories', productCount: 10,
  },
  {
    id: 'c13', slug: 'car-chargers',
    nameEn: 'Car Chargers', nameKa: 'ავტო დამტენები',
    icon: '🔋', image: '', parentSlug: 'car-accessories', productCount: 12,
  },

  // ── Computer Accessories ───────────────────────────────────
  {
    id: 'c14', slug: 'keyboards',
    nameEn: 'Keyboards', nameKa: 'კლავიატურები',
    icon: '⌨️', image: '', parentSlug: 'computer-accessories', productCount: 10,
  },
  {
    id: 'c15', slug: 'mouse',
    nameEn: 'Mouse', nameKa: 'მაუსები',
    icon: '🖱️', image: '', parentSlug: 'computer-accessories', productCount: 10,
  },
  {
    id: 'c16', slug: 'usb-flash-drives',
    nameEn: 'USB Flash Drives', nameKa: 'USB ფლეშ დრაივები',
    icon: '💾', image: '', parentSlug: 'computer-accessories', productCount: 8,
  },

  // ── 100% Original ──────────────────────────────────────────
  {
    id: 'c17', slug: 'apple',
    nameEn: 'Apple', nameKa: 'Apple',
    icon: '🍎', image: '', parentSlug: 'original', productCount: 8,
  },
  {
    id: 'c18', slug: 'samsung',
    nameEn: 'Samsung', nameKa: 'Samsung',
    icon: '📱', image: '', parentSlug: 'original', productCount: 7,
  },
  {
    id: 'c19', slug: 'google',
    nameEn: 'Google', nameKa: 'Google',
    icon: '🔍', image: '', parentSlug: 'original', productCount: 5,
  },
];

export function getParentCategories(): Category[] {
  return categories.filter((c) => !c.parentSlug);
}

export function getSubcategories(parentSlug: CategorySlug): Category[] {
  return categories.filter((c) => c.parentSlug === parentSlug);
}

export function getCategoryBySlug(slug: CategorySlug): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getParentSlug(slug: CategorySlug): CategorySlug | undefined {
  return categories.find((c) => c.slug === slug)?.parentSlug;
}

export const products: Product[] = [
  {
    id: '1',
    slug: 'iphone-15-pro-clear-case',
    nameEn: 'iPhone 15 Pro Clear Case',
    nameKa: 'iPhone 15 Pro გამჭვირვალე ქეისი',
    descriptionEn: 'Ultra-thin clear case for iPhone 15 Pro. Military-grade drop protection with precise cutouts for all buttons and ports.',
    descriptionKa: 'iPhone 15 Pro-სთვის ულტრა-თხელი გამჭვირვალე ქეისი. სამხედრო დონის დაცვა ვარდნისგან.',
    price: 29.99,
    originalPrice: 39.99,
    category: 'phone-cases',
    brand: 'MoBax',
    images: [
      'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isNew: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 124,
    sku: 'MB-IP15P-CLR',
    specs: {
      Material: 'Polycarbonate + TPU',
      Compatibility: 'iPhone 15 Pro',
      Thickness: '1.2mm',
      Weight: '18g',
      Protection: 'MIL-STD-810G',
    },
  },
  {
    id: '2',
    slug: 'samsung-65w-fast-charger',
    nameEn: 'Samsung 65W Fast Charger',
    nameKa: 'Samsung 65W სწრაფი დამტენი',
    descriptionEn: '65W GaN fast charger compatible with all Samsung Galaxy devices. Charges your phone to 50% in just 20 minutes.',
    descriptionKa: '65W GaN სწრაფი დამტენი ყველა Samsung Galaxy მოწყობილობისთვის. 20 წუთში 50%-მდე დამუხტვა.',
    price: 49.99,
    category: 'adapters',
    brand: 'Samsung',
    images: [
      'https://images.unsplash.com/photo-1609592861685-f600d88c9b4f?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 89,
    sku: 'SAM-65W-CHR',
    specs: {
      Power: '65W',
      'Input Voltage': '100-240V',
      'Output Ports': 'USB-C',
      Technology: 'GaN',
      Compatibility: 'Samsung Galaxy, Universal USB-C',
    },
  },
  {
    id: '3',
    slug: 'anker-usb-c-cable-2m',
    nameEn: 'Anker USB-C Cable 2m',
    nameKa: 'Anker USB-C კაბელი 2მ',
    descriptionEn: 'Reinforced 2-meter USB-C to USB-C cable. Supports 100W power delivery and 40Gbps data transfer.',
    descriptionKa: 'გაძლიერებული 2-მეტრიანი USB-C კაბელი. 100W სიმძლავრე და 40Gbps გადაცემა.',
    price: 19.99,
    category: 'cables',
    brand: 'Anker',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 312,
    sku: 'ANK-USBC-2M',
    specs: {
      Length: '2m',
      'Connector Type': 'USB-C to USB-C',
      'Power Delivery': '100W',
      'Data Transfer': '40Gbps',
      Material: 'Braided Nylon',
    },
  },
  {
    id: '4',
    slug: 'universal-car-phone-holder',
    nameEn: 'Universal Car Phone Holder',
    nameKa: 'უნივერსალური ავტო სატელეფონო სამაგრი',
    descriptionEn: 'Magnetic car mount with 360° rotation. Compatible with all phone sizes from 4" to 7".',
    descriptionKa: 'მაგნიტური ავტო სამაგრი 360° ბრუნვით. ყველა ზომის ტელეფონისთვის.',
    price: 24.99,
    category: 'phone-holders',
    brand: 'MoBax',
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 67,
    sku: 'MB-CAR-MNT',
    specs: {
      'Mount Type': 'Magnetic',
      Rotation: '360°',
      Compatibility: '4" - 7" phones',
      Attachment: 'Air Vent / Dashboard',
      Material: 'Aluminum alloy',
    },
  },
  {
    id: '5',
    slug: 'iphone-15-tempered-glass',
    nameEn: 'iPhone 15 Tempered Glass',
    nameKa: 'iPhone 15 დამრჩობი მინა',
    descriptionEn: '9H hardness tempered glass screen protector for iPhone 15. Anti-fingerprint, anti-scratch coating.',
    descriptionKa: '9H სიმტკიცის დამრჩობი მინა iPhone 15-სთვის. თითის ანაბეჭდსა და ნაკაწრსადმი მდგრადი.',
    price: 14.99,
    originalPrice: 19.99,
    category: 'screen-shields',
    brand: 'MoBax',
    images: [
      'https://images.unsplash.com/photo-1560393462-dc9ad7e5e86d?w=600&h=600&fit=crop',
    ],
    inStock: true,
    rating: 4.7,
    reviewCount: 203,
    sku: 'MB-IP15-TG',
    specs: {
      Hardness: '9H',
      Thickness: '0.33mm',
      Compatibility: 'iPhone 15',
      Coating: 'Anti-fingerprint, Anti-scratch',
      Installation: 'Dust-free, Self-adhesive',
    },
  },
  {
    id: '6',
    slug: 'apple-magsafe-charger',
    nameEn: 'Apple MagSafe Charger',
    nameKa: 'Apple MagSafe დამტენი',
    descriptionEn: 'Original Apple MagSafe charger for iPhone 12 and later. 15W wireless charging.',
    descriptionKa: 'ორიგინალი Apple MagSafe დამტენი iPhone 12 და უახლესი მოდელებისთვის. 15W უსადენო დამუხტვა.',
    price: 79.99,
    category: 'apple',
    brand: 'Apple',
    images: [
      'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 445,
    sku: 'APL-MSFC-15W',
    specs: {
      Power: '15W',
      Compatibility: 'iPhone 12 and later',
      Cable: '1m USB-C',
      Type: 'Wireless Magnetic',
      Certification: 'Made for iPhone (MFi)',
    },
  },
  {
    id: '7',
    slug: 'samsung-s24-leather-case',
    nameEn: 'Samsung S24 Leather Case',
    nameKa: 'Samsung S24 ტყავის ქეისი',
    descriptionEn: 'Premium genuine leather case for Samsung Galaxy S24. Card slot, kickstand, magnetic closure.',
    descriptionKa: 'პრემიუმ ნამდვილი ტყავის ქეისი Samsung Galaxy S24-სთვის. ბარათის სლოტი, სამდგომი.',
    price: 44.99,
    category: 'phone-cases',
    brand: 'MoBax',
    images: [
      'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isNew: true,
    rating: 4.6,
    reviewCount: 38,
    sku: 'MB-S24-LTH',
    specs: {
      Material: 'Genuine Leather',
      Compatibility: 'Samsung Galaxy S24',
      Features: 'Card slot, Kickstand',
      Closure: 'Magnetic',
      Colors: 'Black, Brown, Tan',
    },
  },
  {
    id: '8',
    slug: 'baseus-20000mah-powerbank',
    nameEn: 'Baseus 20000mAh Power Bank',
    nameKa: 'Baseus 20000mAh ელ. ბატარეა',
    descriptionEn: '20000mAh power bank with 65W fast charging. Three output ports, LED display.',
    descriptionKa: '20000mAh ელ. ბატარეა 65W სწრაფი დამუხტვით. სამი გამომყვანი, LED ეკრანი.',
    price: 59.99,
    originalPrice: 74.99,
    category: 'charger-complect',
    brand: 'Baseus',
    images: [
      'https://images.unsplash.com/photo-1609592861685-f600d88c9b4f?w=600&h=600&fit=crop',
    ],
    inStock: false,
    rating: 4.7,
    reviewCount: 156,
    sku: 'BAS-20K-PB',
    specs: {
      Capacity: '20000mAh',
      'Max Output': '65W',
      Ports: '2x USB-C + 1x USB-A',
      Display: 'LED Percentage',
      Weight: '420g',
    },
  },
  {
    id: '9',
    slug: 'jbl-tune-510bt',
    nameEn: 'JBL Tune 510BT Wireless Headphones',
    nameKa: 'JBL Tune 510BT უსადენო ყურსასმენები',
    descriptionEn: 'On-ear wireless headphones with 40-hour battery life and JBL Pure Bass Sound.',
    descriptionKa: 'სასმენი უსადენო ყურსასმენები 40-საათიანი ბატარეით და JBL Pure Bass ხმით.',
    price: 69.99,
    originalPrice: 89.99,
    category: 'wireless-headphones',
    brand: 'JBL',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isNew: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 211,
    sku: 'JBL-T510BT',
    specs: {
      Type: 'On-ear',
      Connectivity: 'Bluetooth 5.0',
      'Battery Life': '40 hours',
      'Charging Time': '2 hours',
      Weight: '160g',
    },
  },
  {
    id: '10',
    slug: 'logitech-mx-keys-mini',
    nameEn: 'Logitech MX Keys Mini',
    nameKa: 'Logitech MX Keys Mini კლავიატურა',
    descriptionEn: 'Compact wireless keyboard with backlight, multi-device pairing and smart illumination.',
    descriptionKa: 'კომპაქტური უსადენო კლავიატურა განათებით, მრავალ მოწყობილობის პეარინგით.',
    price: 119.99,
    category: 'keyboards',
    brand: 'Logitech',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 94,
    sku: 'LOG-MXKM',
    specs: {
      Connectivity: 'Bluetooth / USB receiver',
      Layout: 'Compact TKL',
      Backlight: 'Smart illumination',
      'Battery Life': '10 days (backlit) / 5 months',
      Compatibility: 'Windows, macOS, Linux',
    },
  },
  {
    id: '11',
    slug: 'samsung-galaxy-buds2-pro',
    nameEn: 'Samsung Galaxy Buds2 Pro',
    nameKa: 'Samsung Galaxy Buds2 Pro',
    descriptionEn: 'Original Samsung true wireless earbuds with ANC, 360 audio and IPX7 water resistance.',
    descriptionKa: 'ორიგინალი Samsung TWS ყურსასმენები ANC-ით, 360 აუდიოთი და IPX7 წყალგამძლეობით.',
    price: 149.99,
    category: 'samsung',
    brand: 'Samsung',
    images: [
      'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=600&h=600&fit=crop',
    ],
    inStock: true,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 178,
    sku: 'SAM-GBD2P',
    specs: {
      Type: 'True Wireless',
      ANC: 'Yes',
      'Battery (buds)': '5 hours',
      'Battery (case)': '18 hours total',
      'Water Resistance': 'IPX7',
    },
  },
  {
    id: '12',
    slug: 'fm-modulator-bluetooth',
    nameEn: 'Bluetooth FM Modulator',
    nameKa: 'Bluetooth FM მოდულატორი',
    descriptionEn: 'Bluetooth 5.0 FM transmitter with dual USB charging, hands-free calls, LCD display.',
    descriptionKa: 'Bluetooth 5.0 FM გადამცემი ორმაგი USB დამუხტვით, ჰენდსფრი, LCD ეკრანი.',
    price: 34.99,
    category: 'modulators',
    brand: 'MoBax',
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=600&fit=crop',
    ],
    inStock: true,
    rating: 4.3,
    reviewCount: 52,
    sku: 'MB-FM-BT5',
    specs: {
      Bluetooth: '5.0',
      'FM Range': '87.5 – 108.0 MHz',
      'USB Ports': '2x USB-A (QC 3.0)',
      Display: 'LCD Color',
      'Hands-free': 'Yes',
    },
  },
];

export function getProductsByCategory(slug: CategorySlug): Product[] {
  const sub = getSubcategories(slug);
  if (sub.length > 0) {
    const subSlugs = sub.map((s) => s.slug);
    return products.filter((p) => subSlugs.includes(p.category));
  }
  return products.filter((p) => p.category === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.isFeatured);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}
