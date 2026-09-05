/**
 * SEO layer — canonical URLs, per-page metadata, and JSON-LD.
 *
 * Every storefront page builds its <head> from here so titles, descriptions,
 * canonicals and hreflang stay consistent across locales. Before this existed
 * every page inherited the same title from app/layout.tsx, so all 30+ product
 * pages were duplicates of one another in search results.
 *
 * Georgian is the default locale (see middleware.ts), so KA copy is written
 * first and EN is the alternate — not the other way around.
 */

import type { Metadata } from 'next';
import type { Product, Category } from '@/lib/types';

const FALLBACK_SITE_URL = 'https://www.mobax.ge';

/**
 * Absolute origin used for canonicals, hreflang, and the sitemap.
 *
 * `??` alone is not enough here: NEXT_PUBLIC_SITE_URL is *defined* but empty in
 * some environments, which slips past a nullish check and then throws
 * "Invalid URL" from `new URL('')` during the build. Anything that isn't a
 * parseable absolute URL falls back to the production origin.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'MoBax';
export const LOCALES = ['ka', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ka';

/** Search-visible copy caps. Google truncates well before the hard limits. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

/**
 * Trim to a length without cutting a word in half. Georgian words are long and
 * a mid-word cut reads as broken text in a SERP snippet, so we back off to the
 * last space rather than hard-slicing.
 */
export function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function absoluteUrl(path = ''): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Canonical + hreflang for one logical page.
 *
 * `path` is the locale-less route ('' for home, '/products/foo' for a product).
 * x-default points at the Georgian version: it is the default locale and the
 * primary market.
 */
export function alternates(path: string, locale: Locale): Metadata['alternates'] {
  const suffix = path === '/' ? '' : path;
  return {
    canonical: absoluteUrl(`/${locale}${suffix}`),
    languages: {
      ka: absoluteUrl(`/ka${suffix}`),
      en: absoluteUrl(`/en${suffix}`),
      'x-default': absoluteUrl(`/ka${suffix}`),
    },
  };
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  images?: string[];
  /** Set on pages that must never enter the index (cart, account, checkout). */
  noindex?: boolean;
}

/** Builds a complete, unique <head> for a storefront page. */
export function pageMetadata({
  title,
  description,
  path,
  locale,
  images,
  noindex,
}: PageMetaInput): Metadata {
  const clampedTitle = clamp(title, TITLE_MAX);
  const clampedDescription = clamp(description, DESCRIPTION_MAX);
  const url = absoluteUrl(`/${locale}${path === '/' ? '' : path}`);
  const image = images?.[0];

  return {
    metadataBase: new URL(SITE_URL),
    title: clampedTitle,
    description: clampedDescription,
    alternates: alternates(path, locale),
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: clampedTitle,
      description: clampedDescription,
      url,
      locale: locale === 'ka' ? 'ka_GE' : 'en_US',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: clampedTitle,
      description: clampedDescription,
      images: image ? [image] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Keyword-led copy
 *
 * The strings below are the researched Georgian buying terms for this
 * market. They belong in the title/description of the pages that can
 * actually satisfy them — putting them anywhere else is keyword stuffing
 * and Google discounts it.
 * ------------------------------------------------------------------ */

interface CategoryCopy {
  titleKa: string;
  titleEn: string;
  descKa: string;
  descEn: string;
}

/**
 * Per-category search copy, keyed by category slug. A category with no entry
 * falls back to a generated title built from its own name, so adding a
 * category in admin never ships an empty <title>.
 */
export const CATEGORY_SEO: Record<string, CategoryCopy> = {
  chargers: {
    titleKa: 'ტელეფონის დამტენი და სწრაფი დამტენი',
    titleEn: 'Phone Chargers & Fast Chargers',
    descKa:
      'სწრაფი დამტენი iPhone-სა და Android-სთვის — Apple, Samsung, Xiaomi, Google. ორიგინალი, გარანტიით. მიტანა თბილისში და საქართველოში.',
    descEn:
      'Fast chargers for iPhone and Android — Apple, Samsung, Xiaomi and Google. Original with warranty. Delivery in Tbilisi and across Georgia.',
  },
  adapters: {
    titleKa: 'USB-C ადაპტერები 20W–65W',
    titleEn: 'USB-C Power Adapters 20W–65W',
    descKa:
      'USB-C ადაპტერი 20W-დან 65W-მდე. სწრაფი დატენვა iPhone-სა და Android-სთვის. ორიგინალი და თავსებადი მოდელები, გარანტიით.',
    descEn:
      'USB-C power adapters from 20W to 65W with fast charging for iPhone and Android. Original and compatible models, with warranty.',
  },
  cables: {
    titleKa: 'Type-C კაბელი და Lightning კაბელი',
    titleEn: 'Type-C & Lightning Cables',
    descKa:
      'Type-C კაბელი, Lightning კაბელი და USB კაბელები — Hoco, Borofone, Apple. გამძლე, სწრაფი დატენვით. ₾7-დან, მიტანა თბილისში.',
    descEn:
      'Type-C, Lightning and USB cables from Hoco, Borofone and Apple. Durable, fast-charge rated. From ₾7 with delivery in Tbilisi.',
  },
  'charger-complect': {
    titleKa: 'დამტენის კომპლექტები კაბელით',
    titleEn: 'Charger Sets with Cable',
    descKa:
      'დამტენის სრული კომპლექტი — ადაპტერი და კაბელი ერთად. უფრო მომგებიანი, ვიდრე ცალკე ყიდვა. მიტანა საქართველოში.',
    descEn:
      'Complete charging kits — adapter and cable together. Better value than buying separately. Delivery across Georgia.',
  },
  'phone-protection': {
    titleKa: 'ტელეფონის ქეისი და ეკრანის დამცავი',
    titleEn: 'Phone Cases & Screen Protection',
    descKa:
      'ტელეფონის ქეისი, აიფონის ქეისი და ეკრანის დამცავი მინა ყველა პოპულარული მოდელისთვის. მიტანა თბილისში და საქართველოში.',
    descEn:
      'Phone cases, iPhone cases and screen protectors for all popular models. Delivery in Tbilisi and across Georgia.',
  },
  'phone-cases': {
    titleKa: 'აიფონის ქეისი და Samsung ქეისი',
    titleEn: 'iPhone & Samsung Phone Cases',
    descKa:
      'აიფონის ქეისი და Samsung ქეისი — სილიკონის, გამჭვირვალე და დამცავი მოდელები. ტელეფონის ქეისი ყველა პოპულარულ მოდელზე.',
    descEn:
      'iPhone and Samsung cases — silicone, clear and shockproof. Protective phone cases for all popular models.',
  },
  'screen-shields': {
    titleKa: 'ეკრანის დამცავი მინა',
    titleEn: 'Screen Protectors & Tempered Glass',
    descKa:
      'ეკრანის დამცავი 9H მინა iPhone, Samsung და Xiaomi-სთვის. დაკვრა ადგილზე, მაღაზიაში თბილისში.',
    descEn:
      '9H tempered glass screen protectors for iPhone, Samsung and Xiaomi. Fitted in store in Tbilisi.',
  },
  'headphones-speakers': {
    titleKa: 'ყურსასმენები და დინამიკები',
    titleEn: 'Headphones & Bluetooth Speakers',
    descKa:
      'უსადენო ყურსასმენები, სადენიანი ყურსასმენები და Bluetooth დინამიკები — AirPods, JBL, Marshall. მიტანა საქართველოში.',
    descEn:
      'Wireless earbuds, wired headphones and Bluetooth speakers — AirPods, JBL and Marshall. Delivery across Georgia.',
  },
  'wireless-headphones': {
    titleKa: 'უსადენო ყურსასმენები და AirPods',
    titleEn: 'Wireless Earbuds & Headphones',
    descKa:
      'უსადენო ყურსასმენები Bluetooth-ით და ხმაურის შთანთქმით. AirPods და TWS მოდელები. მიტანა თბილისში და საქართველოში.',
    descEn:
      'Wireless Bluetooth earbuds with noise cancelling. AirPods and TWS models. Delivery in Tbilisi and across Georgia.',
  },
  'wired-headphones': {
    titleKa: 'სადენიანი ყურსასმენები',
    titleEn: 'Wired Headphones',
    descKa: 'სადენიანი ყურსასმენები 3.5mm და Type-C შესაერთებლით. მიტანა საქართველოში.',
    descEn: 'Wired headphones with 3.5mm and Type-C connectors. Delivery across Georgia.',
  },
  'bluetooth-speakers': {
    titleKa: 'Bluetooth დინამიკები',
    titleEn: 'Bluetooth Speakers',
    descKa: 'პორტატული Bluetooth დინამიკები ხანგრძლივი ბატარეით. მიტანა თბილისში.',
    descEn: 'Portable Bluetooth speakers with long battery life. Delivery in Tbilisi.',
  },
  'car-accessories': {
    titleKa: 'მანქანის აქსესუარები და დამტენი',
    titleEn: 'Car Phone Accessories',
    descKa:
      'მანქანის დამტენი, ტელეფონის სამაგრი და FM მოდულატორები. ყველაფერი მანქანისთვის, მიტანით საქართველოში.',
    descEn:
      'Car chargers, phone holders and FM modulators. Everything for your car, delivered across Georgia.',
  },
  'car-chargers': {
    titleKa: 'მანქანის დამტენი USB-C',
    titleEn: 'Car Chargers USB-C',
    descKa:
      'მანქანის დამტენი USB-C PD სწრაფი დატენვით. ორმაგი პორტით, ყველა ტელეფონისთვის. მიტანა თბილისში.',
    descEn:
      'USB-C PD car chargers with fast charging and dual ports for every phone. Delivery in Tbilisi.',
  },
  'phone-holders': {
    titleKa: 'ტელეფონის სამაგრი მანქანისთვის',
    titleEn: 'Car Phone Holders & Mounts',
    descKa:
      'ტელეფონის სამაგრი მანქანაში — მაგნიტური, ვენტილაციისა და პანელის მოდელები. მიტანა საქართველოში.',
    descEn:
      'Car phone holders — magnetic, vent and dashboard mounts. Delivery across Georgia.',
  },
  modulators: {
    titleKa: 'FM მოდულატორები მანქანისთვის',
    titleEn: 'FM Modulators for Car',
    descKa: 'FM მოდულატორები Bluetooth-ითა და USB დატენვით მანქანისთვის.',
    descEn: 'FM modulators with Bluetooth and USB charging for your car.',
  },
  'computer-accessories': {
    titleKa: 'კომპიუტერის აქსესუარები',
    titleEn: 'Computer Accessories',
    descKa: 'კლავიატურები, მაუსები და USB ფლეშ მეხსიერებები. მიტანა თბილისში და საქართველოში.',
    descEn: 'Keyboards, mice and USB flash drives. Delivery in Tbilisi and across Georgia.',
  },
  keyboards: {
    titleKa: 'კლავიატურები',
    titleEn: 'Keyboards',
    descKa: 'სადენიანი და უსადენო კლავიატურები კომპიუტერისთვის. მიტანა საქართველოში.',
    descEn: 'Wired and wireless keyboards for your computer. Delivery across Georgia.',
  },
  mouse: {
    titleKa: 'კომპიუტერის მაუსი',
    titleEn: 'Computer Mice',
    descKa: 'სადენიანი და უსადენო მაუსები კომპიუტერისა და ლეპტოპისთვის.',
    descEn: 'Wired and wireless mice for desktop and laptop.',
  },
  'usb-flash-drives': {
    titleKa: 'USB ფლეშ მეხსიერება',
    titleEn: 'USB Flash Drives',
    descKa: 'USB ფლეშ მეხსიერებები სხვადასხვა მოცულობით. მიტანა თბილისში.',
    descEn: 'USB flash drives in a range of capacities. Delivery in Tbilisi.',
  },
  'aux-converters': {
    titleKa: 'AUX კაბელები და გადამყვანები',
    titleEn: 'AUX Cables & Converters',
    descKa: 'AUX კაბელები და აუდიო გადამყვანები Type-C და Lightning პორტისთვის.',
    descEn: 'AUX cables and audio converters for Type-C and Lightning ports.',
  },
  original: {
    titleKa: 'ორიგინალი აქსესუარები გარანტიით',
    titleEn: 'Original Accessories with Warranty',
    descKa:
      '100% ორიგინალი დამტენები და კაბელები — Apple, Samsung, Google. ორიგინალი შეფუთვა და გარანტია. მიტანა საქართველოში.',
    descEn:
      '100% genuine chargers and cables from Apple, Samsung and Google. Original packaging and warranty. Delivery across Georgia.',
  },
  apple: {
    titleKa: 'ორიგინალი Apple დამტენი და კაბელი',
    titleEn: 'Original Apple Chargers & Cables',
    descKa:
      'აიფონის დამტენი და კაბელი — ორიგინალი Apple 20W ადაპტერები, USB-C და Lightning. გარანტიით, თბილისში.',
    descEn:
      'Original Apple 20W adapters, USB-C and Lightning cables for iPhone. With warranty, in Tbilisi.',
  },
  samsung: {
    titleKa: 'ორიგინალი Samsung დამტენი',
    titleEn: 'Original Samsung Chargers',
    descKa:
      'ორიგინალი Samsung 45W დამტენი და Type-C კაბელი. Super Fast Charging, სრული გარანტიით.',
    descEn:
      'Original Samsung 45W travel adapters and Type-C cables. Super Fast Charging with full warranty.',
  },
  google: {
    titleKa: 'ორიგინალი Google Pixel დამტენი',
    titleEn: 'Original Google Pixel Chargers',
    descKa:
      'ორიგინალი Google 30W და 45W USB-C დამტენი Pixel-ისთვის. გარანტიით, მიტანა საქართველოში.',
    descEn:
      'Original Google 30W and 45W USB-C adapters for Pixel. With warranty, delivered across Georgia.',
  },
  'most-popular': {
    titleKa: 'პოპულარული აქსესუარები',
    titleEn: 'Most Popular Accessories',
    descKa:
      'ყველაზე გაყიდვადი დამტენები, კაბელები და ქეისები. შერჩეული პოპულარული აქსესუარები მიტანით.',
    descEn:
      'Our best-selling chargers, cables and cases. Hand-picked popular accessories with delivery.',
  },
};

/** Category <title> / description, falling back to the category's own name. */
export function categorySeo(category: Category, locale: Locale) {
  const copy = CATEGORY_SEO[category.slug];
  const name = locale === 'ka' ? category.nameKa : category.nameEn;

  if (!copy) {
    return {
      title: `${name} | ${SITE_NAME}`,
      description:
        locale === 'ka'
          ? `${name} — MoBax-ის კატალოგი. მობილურის აქსესუარები მიტანით თბილისში და საქართველოში.`
          : `${name} at MoBax. Mobile accessories with delivery in Tbilisi and across Georgia.`,
      heading: name,
    };
  }

  return {
    title: `${locale === 'ka' ? copy.titleKa : copy.titleEn} | ${SITE_NAME}`,
    description: locale === 'ka' ? copy.descKa : copy.descEn,
    heading: name,
  };
}

/**
 * Product <title> / description.
 *
 * Brand leads, because accessories are searched as "brand + model". Price goes
 * in the description rather than the title so a price change doesn't rewrite
 * the title Google has already indexed.
 */
export function productSeo(product: Product, locale: Locale) {
  const name = locale === 'ka' ? product.nameKa : product.nameEn;
  const brand = product.brand && !/^no.?brand$/i.test(product.brand) ? product.brand : '';
  const titleBase = brand && !name.toLowerCase().startsWith(brand.toLowerCase())
    ? `${brand} ${name}`
    : name;

  const price = `₾${product.salePrice ?? product.price}`;
  const description =
    (locale === 'ka' ? product.descriptionKa : product.descriptionEn).trim() ||
    (locale === 'ka'
      ? `${titleBase} — ${price}. ორიგინალი ხარისხი, მიტანა თბილისში და საქართველოში.`
      : `${titleBase} — ${price}. Quality guaranteed, with delivery in Tbilisi and across Georgia.`);

  return {
    title: `${titleBase} ${price} | ${SITE_NAME}`,
    description,
  };
}

/* ------------------------------------------------------------------ *
 * JSON-LD
 *
 * Rendered as <script type="application/ld+json"> by the pages. Google reads
 * price and availability from Product/Offer to show them in the SERP, which
 * is the single highest-CTR win available to a store this size.
 * ------------------------------------------------------------------ */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl('/images/logo-light.png'),
    logo: absoluteUrl('/images/logo-light.png'),
    description:
      'მობილურის აქსესუარები საქართველოში — დამტენები, კაბელები, ქეისები და ყურსასმენები.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tbilisi',
      addressCountry: 'GE',
    },
    areaServed: { '@type': 'Country', name: 'Georgia' },
    currenciesAccepted: 'GEL',
    priceRange: '₾₾',
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: absoluteUrl(`/${locale}`),
    inLanguage: locale === 'ka' ? 'ka-GE' : 'en-US',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl(`/${locale}/search?q={search_term_string}`),
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(product: Product, locale: Locale) {
  const name = locale === 'ka' ? product.nameKa : product.nameEn;
  const description = (locale === 'ka' ? product.descriptionKa : product.descriptionEn).trim();
  const url = absoluteUrl(`/${locale}/products/${product.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description: description || name,
    sku: product.sku,
    image: product.images.length ? product.images : undefined,
    brand: { '@type': 'Brand', name: product.brand },
    // rating/reviewCount are omitted entirely when there are no reviews —
    // emitting an aggregateRating of 0 is a structured-data violation and
    // Google will flag the page rather than ignore the field.
    ...(product.reviewCount > 0 && product.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'GEL',
      price: product.salePrice ?? product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[], locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(`/${locale}${crumb.path === '/' ? '' : crumb.path}`),
    })),
  };
}

export function itemListJsonLd(products: Product[], locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/${locale}/products/${product.slug}`),
      name: locale === 'ka' ? product.nameKa : product.nameEn,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
