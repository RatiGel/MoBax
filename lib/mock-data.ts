export type CategorySlug =
  // ── parents ──
  | 'most-popular'
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
    id: 'p0', slug: 'most-popular',
    nameEn: 'Most Popular', nameKa: 'პოპულარული',
    icon: '🔥',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    productCount: 8,
  },
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
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=300&fit=crop',
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
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop',
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
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&h=600&fit=crop',
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
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&h=600&fit=crop',
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

  // ── Brand seed products ────────────────────────────────────
  // Apple
  {
    id: '13',
    slug: 'apple-airpods-pro-2',
    nameEn: 'Apple AirPods Pro (2nd gen)',
    nameKa: 'Apple AirPods Pro (მე-2 თაობა)',
    descriptionEn: 'Active noise cancellation, adaptive transparency and USB-C charging case. Original Apple.',
    descriptionKa: 'აქტიური ხმაურის ჩახშობა, ადაპტური გამჭვირვალობა და USB-C ქეისი. ორიგინალი Apple.',
    price: 249.99,
    category: 'wireless-headphones',
    brand: 'Apple',
    images: ['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&h=600&fit=crop'],
    inStock: true,
    isNew: true,
    isFeatured: true,
    rating: 4.9,
    reviewCount: 421,
    sku: 'APL-APP2-USBC',
    specs: { Chip: 'H2', 'Noise Cancellation': 'Active', Case: 'USB-C MagSafe', Compatibility: 'iPhone, iPad' },
  },
  // Google
  {
    id: '14',
    slug: 'pixel-8-pro-clear-case',
    nameEn: 'Pixel 8 Pro Clear Case',
    nameKa: 'Pixel 8 Pro გამჭვირვალე ქეისი',
    descriptionEn: 'Slim shock-absorbing clear case engineered for the Google Pixel 8 Pro.',
    descriptionKa: 'თხელი დარტყმაგამძლე გამჭვირვალე ქეისი Google Pixel 8 Pro-სთვის.',
    price: 27.99,
    category: 'phone-cases',
    brand: 'MoBax',
    images: ['https://images.unsplash.com/photo-1592890288564-76628a30a657?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.5,
    reviewCount: 58,
    sku: 'MB-PX8P-CLR',
    specs: { Material: 'TPU', Compatibility: 'Google Pixel 8 Pro', Thickness: '1.1mm' },
  },
  {
    id: '15',
    slug: 'google-pixel-buds-pro',
    nameEn: 'Google Pixel Buds Pro',
    nameKa: 'Google Pixel Buds Pro',
    descriptionEn: 'Original Google wireless earbuds with active noise cancellation and Silent Seal.',
    descriptionKa: 'ორიგინალი Google უსადენო ყურსასმენები ხმაურის ჩახშობით.',
    price: 199.99,
    category: 'wireless-headphones',
    brand: 'Google',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop'],
    inStock: true,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 143,
    sku: 'GGL-PXB-PRO',
    specs: { Bluetooth: '5.3', 'Noise Cancellation': 'Active', Compatibility: 'Pixel, Android' },
  },
  // Xiaomi
  {
    id: '16',
    slug: 'xiaomi-67w-charger',
    nameEn: 'Xiaomi 67W Turbo Charger',
    nameKa: 'Xiaomi 67W Turbo დამტენი',
    descriptionEn: 'Original Xiaomi 67W charger with HyperCharge support for Redmi and POCO devices.',
    descriptionKa: 'ორიგინალი Xiaomi 67W დამტენი HyperCharge მხარდაჭერით Redmi და POCO-სთვის.',
    price: 34.99,
    category: 'adapters',
    brand: 'Xiaomi',
    images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&h=600&fit=crop'],
    inStock: true,
    isNew: true,
    rating: 4.4,
    reviewCount: 76,
    sku: 'XMI-67W-TRB',
    specs: { Power: '67W', Technology: 'HyperCharge', Compatibility: 'Xiaomi, Redmi, POCO' },
  },
  {
    id: '17',
    slug: 'redmi-note-13-tempered-glass',
    nameEn: 'Redmi Note 13 Tempered Glass',
    nameKa: 'Redmi Note 13 დამცავი მინა',
    descriptionEn: '9H tempered glass screen protector cut precisely for the Xiaomi Redmi Note 13.',
    descriptionKa: '9H დამცავი მინა ზუსტად მორგებული Xiaomi Redmi Note 13-ზე.',
    price: 9.99,
    category: 'screen-shields',
    brand: 'MoBax',
    images: ['https://images.unsplash.com/photo-1578319439584-104c94d37305?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.3,
    reviewCount: 92,
    sku: 'MB-RN13-GLS',
    specs: { Hardness: '9H', Compatibility: 'Xiaomi Redmi Note 13' },
  },
  // Hoco
  {
    id: '18',
    slug: 'hoco-x88-usb-c-cable',
    nameEn: 'Hoco X88 USB-C Cable 1m',
    nameKa: 'Hoco X88 USB-C კაბელი 1მ',
    descriptionEn: 'Hoco braided 60W USB-C cable with fast-charge support and reinforced connectors.',
    descriptionKa: 'Hoco გაწნული 60W USB-C კაბელი სწრაფი დატენვით.',
    price: 7.99,
    category: 'cables',
    brand: 'Hoco',
    images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop'],
    inStock: true,
    isFeatured: true,
    rating: 4.2,
    reviewCount: 187,
    sku: 'HOC-X88-1M',
    specs: { Length: '1m', 'Power Delivery': '60W', Compatibility: 'Universal USB-C' },
  },
  {
    id: '19',
    slug: 'hoco-bx-power-bank-10000',
    nameEn: 'Hoco 10000mAh Power Bank',
    nameKa: 'Hoco 10000mAh დამტენი ბატარეა',
    descriptionEn: 'Compact Hoco 10000mAh power bank with dual output and 22.5W fast charging.',
    descriptionKa: 'კომპაქტური Hoco 10000mAh დამტენი ორმაგი გამოსასვლელით.',
    price: 24.99,
    category: 'adapters',
    brand: 'Hoco',
    images: ['https://images.unsplash.com/photo-1631176093617-63490a3d785a?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.4,
    reviewCount: 64,
    sku: 'HOC-PB-10K',
    specs: { Capacity: '10000mAh', Output: '22.5W', Ports: 'USB-A + USB-C' },
  },
  // Borofone
  {
    id: '20',
    slug: 'borofone-bd1-earphones',
    nameEn: 'Borofone BD1 Wired Earphones',
    nameKa: 'Borofone BD1 სადენიანი ყურსასმენები',
    descriptionEn: 'Borofone in-ear wired earphones with mic and 3.5mm jack. Clear, balanced sound.',
    descriptionKa: 'Borofone სადენიანი ყურსასმენები მიკროფონით და 3.5მმ ჯეკით.',
    price: 5.99,
    category: 'wired-headphones',
    brand: 'Borofone',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.0,
    reviewCount: 211,
    sku: 'BOR-BD1-WRD',
    specs: { Connector: '3.5mm', Mic: 'Yes', Compatibility: 'Universal 3.5mm' },
  },
  {
    id: '21',
    slug: 'borofone-bn1-car-charger',
    nameEn: 'Borofone BN1 Car Charger',
    nameKa: 'Borofone BN1 ავტო დამტენი',
    descriptionEn: 'Dual-USB Borofone car charger with smart current distribution and LED indicator.',
    descriptionKa: 'ორმაგი USB Borofone ავტო დამტენი LED ინდიკატორით.',
    price: 8.99,
    category: 'car-chargers',
    brand: 'Borofone',
    images: ['https://images.unsplash.com/photo-1617886322207-6f504e7472c5?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.1,
    reviewCount: 53,
    sku: 'BOR-BN1-CAR',
    specs: { Output: '2.4A', Ports: '2x USB-A', Compatibility: 'Universal 12V' },
  },
  // Marshall
  {
    id: '22',
    slug: 'marshall-emberton-ii',
    nameEn: 'Marshall Emberton II Speaker',
    nameKa: 'Marshall Emberton II დინამიკი',
    descriptionEn: 'Portable Marshall Bluetooth speaker with 30+ hours playtime and IP67 water resistance.',
    descriptionKa: 'პორტატული Marshall Bluetooth დინამიკი 30+ საათი მუშაობით.',
    price: 169.99,
    category: 'bluetooth-speakers',
    brand: 'Marshall',
    images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=600&fit=crop'],
    inStock: true,
    isFeatured: true,
    rating: 4.8,
    reviewCount: 167,
    sku: 'MSH-EMB-II',
    specs: { Bluetooth: '5.1', Battery: '30h', 'Water Resistance': 'IP67' },
  },
  {
    id: '23',
    slug: 'marshall-major-iv',
    nameEn: 'Marshall Major IV Headphones',
    nameKa: 'Marshall Major IV ყურსასმენები',
    descriptionEn: 'Iconic Marshall on-ear headphones with 80+ hours wireless playtime and wireless charging.',
    descriptionKa: 'Marshall on-ear ყურსასმენები 80+ საათი უსადენო მუშაობით.',
    price: 149.99,
    category: 'wireless-headphones',
    brand: 'Marshall',
    images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=600&fit=crop'],
    inStock: true,
    rating: 4.7,
    reviewCount: 98,
    sku: 'MSH-MAJ-IV',
    specs: { Bluetooth: '5.0', Battery: '80h', 'Charging': 'Wireless' },
  },
  // JBL (extra besides existing)
  {
    id: '24',
    slug: 'jbl-tune-510bt',
    nameEn: 'JBL Tune 510BT Headphones',
    nameKa: 'JBL Tune 510BT ყურსასმენები',
    descriptionEn: 'JBL Pure Bass wireless on-ear headphones with 40 hours battery and fast charging.',
    descriptionKa: 'JBL Pure Bass უსადენო ყურსასმენები 40 საათი ბატარეით.',
    price: 49.99,
    category: 'wireless-headphones',
    brand: 'JBL',
    images: ['https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop'],
    inStock: true,
    isFeatured: true,
    rating: 4.5,
    reviewCount: 276,
    sku: 'JBL-T510-BT',
    specs: { Bluetooth: '5.0', Battery: '40h', Sound: 'Pure Bass' },
  },
];

// ── Brands ───────────────────────────────────────────────────
// `device` brands are phone makers — selecting one returns products made by
// the brand AND third-party accessories compatible with its devices.
// `maker` brands are accessory manufacturers — match on the product's brand only.
export interface Brand {
  slug: string;
  name: string;
  type: 'device' | 'maker';
  // extra terms (besides `name`) to look for in specs.Compatibility for device brands
  compatTerms?: string[];
}

export const brands: Brand[] = [
  { slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone', 'iPad', 'AirPods', 'MagSafe', 'Apple'] },
  { slug: 'samsung', name: 'Samsung', type: 'device', compatTerms: ['Galaxy', 'Samsung'] },
  { slug: 'google', name: 'Google', type: 'device', compatTerms: ['Pixel', 'Google'] },
  { slug: 'xiaomi', name: 'Xiaomi', type: 'device', compatTerms: ['Xiaomi', 'Redmi', 'POCO', 'Mi '] },
  { slug: 'hoco', name: 'Hoco', type: 'maker' },
  { slug: 'borofone', name: 'Borofone', type: 'maker' },
  { slug: 'marshall', name: 'Marshall', type: 'maker' },
  { slug: 'jbl', name: 'JBL', type: 'maker' },
];

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}

/**
 * Products associated with a brand.
 * - maker brand → products manufactured by that brand
 * - device brand → products made by the brand OR compatible with its devices
 */
export function getProductsByBrand(slug: string): Product[] {
  const brand = getBrandBySlug(slug);
  if (!brand) return [];

  const nameMatch = (p: Product) =>
    p.brand.toLowerCase() === brand.name.toLowerCase();

  if (brand.type === 'maker') {
    return products.filter(nameMatch);
  }

  // device brand: maker OR compatibility match (case-insensitive substring)
  const terms = [brand.name, ...(brand.compatTerms ?? [])].map((t) => t.toLowerCase());
  return products.filter((p) => {
    if (nameMatch(p)) return true;
    const compat = (p.specs?.Compatibility ?? '').toLowerCase();
    return terms.some((t) => compat.includes(t));
  });
}

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

// Free-text product search for the AI assistant. Scores each product by how many
// of the supplied keyword tokens it matches across name/description/specs/brand,
// optionally constrained to a category. Returns best matches, highest score first.
export interface ProductSearchQuery {
  keywords?: string[];
  category?: CategorySlug;
  maxPrice?: number;
  minPrice?: number;
}

export function searchProducts(query: ProductSearchQuery, limit = 6): Product[] {
  const tokens = (query.keywords ?? [])
    .flatMap((k) => k.toLowerCase().split(/\s+/))
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  let pool = [...products];

  if (query.category) {
    const subs = getSubcategories(query.category);
    if (subs.length > 0) {
      const subSlugs = subs.map((s) => s.slug);
      pool = pool.filter((p) => subSlugs.includes(p.category));
    } else {
      pool = pool.filter((p) => p.category === query.category);
    }
  }
  if (typeof query.maxPrice === 'number') pool = pool.filter((p) => p.price <= query.maxPrice!);
  if (typeof query.minPrice === 'number') pool = pool.filter((p) => p.price >= query.minPrice!);

  if (tokens.length === 0) {
    // No keywords — fall back to popularity within the (possibly category-filtered) pool.
    return pool.sort((a, b) => b.reviewCount * b.rating - a.reviewCount * a.rating).slice(0, limit);
  }

  const haystack = (p: Product) =>
    [
      p.nameEn, p.nameKa, p.descriptionEn, p.descriptionKa, p.brand,
      ...Object.values(p.specs),
    ]
      .join(' ')
      .toLowerCase();

  const scored = pool
    .map((p) => {
      const text = haystack(p);
      const score = tokens.reduce((s, t) => (text.includes(t) ? s + 1 : s), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.reviewCount - a.p.reviewCount);

  return scored.slice(0, limit).map((x) => x.p);
}

// Popularity score: review volume weighted by rating. Highest = most popular.
export function getPopularProducts(limit = 8): Product[] {
  return [...products]
    .sort((a, b) => b.reviewCount * b.rating - a.reviewCount * a.rating)
    .slice(0, limit);
}

// Newest = last entries in the product array (append-order = arrival-order).
export function getNewArrivals(limit = 8): Product[] {
  return [...products].slice(-limit).reverse();
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}
