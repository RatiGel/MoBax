import { getProducts, getCategories, getSubcategories } from '@/lib/catalog';
import { categoryMatchSlugs } from '@/lib/catalog-map';
import type { CategorySlug, Product } from '@/lib/types';

/**
 * Retrieval for the shopping assistant.
 *
 * Deliberately separate from `searchProducts` in lib/mock-data.ts: that one
 * backs the search page, where the user typed the words themselves and a
 * literal substring match is the right, predictable behaviour. Here the
 * "query" is a model's guess at what someone meant, so it needs to degrade
 * gracefully — a wrong guess should cost a product some rank, not erase it.
 *
 * Two differences that matter:
 *
 * 1. Fields are weighted. `searchProducts` counts a token hit anywhere in one
 *    concatenated blob, so "apple" in a description outranks nothing and ties
 *    with "Apple" as the brand. A device model matching the product NAME is a
 *    far stronger signal than the same word appearing in prose.
 *
 * 2. Unmatched tokens don't zero the result. `searchProducts` filters to
 *    `score > 0` against every token pooled together; one hallucinated term
 *    ("durable", "premium" — words no product contains) still leaves the rest
 *    scoring, but a query made entirely of such words returns nothing at all.
 *    We fall back to popularity within the filtered pool instead of an empty
 *    hand, because "here's what's popular" beats "no results" in a chat.
 */

export interface AssistantQuery {
  keywords?: string[];
  category?: CategorySlug;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Only consider items that are actually buyable. */
  inStockOnly?: boolean;
  /** 'price-asc' surfaces budget picks; 'popular' is the default. */
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'rating';
  /** The shopper's stated device, checked against each item's Compatibility. */
  device?: string;
}

export interface ScoredProduct {
  product: Product;
  score: number;
  /** Which tokens actually hit, for debugging and for grounding the reply. */
  matched: string[];
  /**
   * True when the shopper named a device and this product's Compatibility spec
   * names a *different* one. The catalog is small, so a near-miss is often the
   * best we have and still worth showing — but the reply must say so rather
   * than presenting a Galaxy S24 case as the answer to "iPhone 14".
   */
  deviceMismatch?: boolean;
}

const WEIGHT = {
  name: 6,
  brand: 5,
  specs: 3,
  category: 2,
  description: 1,
} as const;

function tokenize(keywords: string[]): string[] {
  return Array.from(
    new Set(
      keywords
        .flatMap((k) => k.toLowerCase().split(/[\s,/]+/))
        .map((t) => t.replace(/[^a-z0-9Ⴀ-ჿ+]/gi, '').trim())
        // 1-char tokens match everything; "s" would hit every product.
        .filter((t) => t.length > 1)
    )
  );
}

/**
 * Does this product's Compatibility spec contradict the shopper's device?
 *
 * Deliberately conservative: it only reports a mismatch when the spec names a
 * specific competing model. Universal accessories ("All smartphones",
 * "USB-C devices") and items with no Compatibility spec are never flagged,
 * because a false mismatch would make the assistant apologise for a product
 * that fits perfectly.
 *
 * The signal is the model NUMBER. Phone lines are distinguished by digits
 * ("iPhone 14" vs "iPhone 15", "S23" vs "S24"), and comparing on brand words
 * alone would call every iPhone case a match for every iPhone.
 */
function contradictsDevice(product: Product, device: string): boolean {
  const compat = product.specs.Compatibility;
  if (!compat) return false;

  const c = compat.toLowerCase();
  // Universal — fits whatever they have.
  if (/\ball\b|universal|any\s|most\s/.test(c)) return false;

  const d = device.toLowerCase();
  const family = (s: string) =>
    /iphone|apple/.test(s) ? 'apple'
      : /galaxy|samsung/.test(s) ? 'samsung'
      : /pixel|google/.test(s) ? 'google'
      : null;

  const df = family(d);
  const cf = family(c);
  // Different brand entirely: a Galaxy case for an iPhone shopper.
  if (df && cf && df !== cf) return true;
  if (!df || !cf) return false;

  const deviceNums = (d.match(/\d+/g) ?? []).map(Number);
  const compatNums = (c.match(/\d+/g) ?? []).map(Number);
  if (!deviceNums.length || !compatNums.length) return false;

  // Open-ended ranges: "iPhone 12 and later" covers 14 and 15. Without this
  // the correct MagSafe charger gets flagged for every modern iPhone — the
  // exact opposite of the warning's purpose.
  if (/and later|or later|and newer|and above|\+/.test(c)) {
    return deviceNums[0] < compatNums[0];
  }
  if (/and earlier|or older|and below/.test(c)) {
    return deviceNums[0] > compatNums[0];
  }

  // Otherwise the spec lists explicit models; the device must be one of them.
  return !compatNums.includes(deviceNums[0]);
}

/** Expand a parent category to itself + its children, matching storefront behaviour. */
async function categoryPool(slug: CategorySlug, products: Product[]): Promise<Product[]> {
  const subs = await getSubcategories(slug);
  const slugs = categoryMatchSlugs(slug, [{ slug, parentSlug: undefined }, ...subs]);
  return products.filter((p) => slugs.includes(p.category));
}

function sortPool(pool: Product[], sort: AssistantQuery['sort']): Product[] {
  const popularity = (p: Product) => p.reviewCount * p.rating;
  switch (sort) {
    case 'price-asc':
      return [...pool].sort((a, b) => a.price - b.price);
    case 'price-desc':
      return [...pool].sort((a, b) => b.price - a.price);
    case 'rating':
      return [...pool].sort((a, b) => b.rating - a.rating || popularity(b) - popularity(a));
    default:
      return [...pool].sort((a, b) => popularity(b) - popularity(a));
  }
}

export async function findProducts(query: AssistantQuery, limit = 4): Promise<ScoredProduct[]> {
  const allProducts = await getProducts();
  let pool = query.category ? await categoryPool(query.category, allProducts) : [...allProducts];

  if (query.brand) {
    const b = query.brand.toLowerCase();
    const branded = pool.filter((p) => p.brand.toLowerCase() === b);
    // A brand the catalog doesn't carry shouldn't wipe the results — the
    // customer still wants *something*, and the reply can note the mismatch.
    if (branded.length > 0) pool = branded;
  }
  if (typeof query.minPrice === 'number') pool = pool.filter((p) => p.price >= query.minPrice!);
  if (typeof query.maxPrice === 'number') pool = pool.filter((p) => p.price <= query.maxPrice!);
  if (query.inStockOnly) pool = pool.filter((p) => p.inStock);

  const flag = (product: Product) => ({
    product,
    score: 0,
    matched: [] as string[],
    deviceMismatch: query.device ? contradictsDevice(product, query.device) : false,
  });

  const tokens = tokenize(query.keywords ?? []);
  if (tokens.length === 0) {
    return sortPool(pool, query.sort).slice(0, limit).map(flag);
  }

  const scored = pool
    .map((product) => {
      const name = `${product.nameEn} ${product.nameKa}`.toLowerCase();
      const brand = product.brand.toLowerCase();
      const specs = Object.values(product.specs).join(' ').toLowerCase();
      const category = product.category.replace(/-/g, ' ');
      const description = `${product.descriptionEn} ${product.descriptionKa}`.toLowerCase();

      let score = 0;
      const matched: string[] = [];
      for (const t of tokens) {
        let best = 0;
        if (name.includes(t)) best = WEIGHT.name;
        else if (brand.includes(t)) best = WEIGHT.brand;
        else if (specs.includes(t)) best = WEIGHT.specs;
        else if (category.includes(t)) best = WEIGHT.category;
        else if (description.includes(t)) best = WEIGHT.description;
        if (best > 0) {
          score += best;
          matched.push(t);
        }
      }

      // Nudge, don't decide: a rating tiebreak between equal keyword hits.
      if (score > 0) score += Math.min(product.rating, 5) / 10;
      if (score > 0 && !product.inStock) score -= 2;

      const deviceMismatch = query.device
        ? contradictsDevice(product, query.device)
        : false;
      // Demote the wrong model rather than dropping it: with 3 cases in the
      // catalog, a near-miss the reply is honest about beats "no results".
      if (deviceMismatch) score -= 4;

      return { product, score, matched, deviceMismatch };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.product.reviewCount - a.product.reviewCount);

  if (scored.length === 0) {
    // Every token missed. The filters (category/price/brand) still narrowed
    // the pool honestly, so answer from that rather than returning nothing.
    return sortPool(pool, query.sort).slice(0, limit).map(flag);
  }

  // Top up from the filtered pool when keyword scoring found only one or two.
  // A single result reads as "that's all we have"; showing the rest of the
  // category (flagged if it doesn't fit) lets the shopper see the real range.
  if (scored.length < limit) {
    const have = new Set(scored.map((s) => s.product.id));
    const filler = sortPool(pool, query.sort)
      .filter((p) => !have.has(p.id))
      .slice(0, limit - scored.length)
      .map(flag);
    return [...scored, ...filler];
  }

  return scored.slice(0, limit);
}

/**
 * The vocabulary the extractor is allowed to draw on.
 *
 * The old prompt listed category slugs and nothing else, so the model invented
 * keywords ("durable", "premium") that appear nowhere in the catalog and
 * scored zero. Handing it the real brands, spec values, and price range keeps
 * extraction inside terms that can actually match something.
 */
export async function catalogVocabulary() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const prices = products.map((p) => p.price);
  const specValues = new Set<string>();
  for (const p of products) {
    for (const v of Object.values(p.specs)) {
      // Spec values are short phrases ("Silicone", "20W", "IPX7"); split them
      // so "MagSafe compatible" contributes "magsafe".
      for (const part of v.split(/[,/]| and /)) {
        const clean = part.trim();
        if (clean.length > 1 && clean.length < 28) specValues.add(clean);
      }
    }
  }

  return {
    brands,
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.nameEn,
      parent: c.parentSlug,
    })),
    specValues: Array.from(specValues).sort(),
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
    },
  };
}

/** Shape sent to the browser. Never ships descriptions or internal fields. */
export function toPublicProduct(p: Product, locale: string) {
  const isKa = locale === 'ka';
  return {
    id: p.id,
    slug: p.slug,
    name: isKa ? p.nameKa : p.nameEn,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.images[0],
    rating: p.rating,
    reviewCount: p.reviewCount,
    category: p.category,
    brand: p.brand,
    inStock: p.inStock,
  };
}
