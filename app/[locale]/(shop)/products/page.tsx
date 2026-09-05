import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  getProducts,
  getCategories,
  getBrands,
  getProductsByBrand,
  getCategoryBySlug,
  getCategoryProductCounts,
} from '@/lib/catalog';
import { JsonLd } from '@/components/JsonLd';
import {
  pageMetadata,
  categorySeo,
  breadcrumbJsonLd,
  itemListJsonLd,
  SITE_NAME,
  type Locale,
} from '@/lib/seo';
import { ProductsPageClient } from './ProductsPageClient';

/**
 * Metadata and the crawlable heading both depend on ?category=, so this route
 * must render per-request. Left static it prerenders to a single shell and
 * every category URL is served the same <head> — the duplicate-title problem
 * this page exists to fix.
 *
 * `revalidate` is deliberately not exported alongside this: a numeric
 * revalidate and force-dynamic conflict, and the ISR value wins, which
 * silently restores the static shell. Freshness still comes from the DB read
 * on every request.
 */
export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  params: { locale: string };
  searchParams: { category?: string; brand?: string };
}

/**
 * The listing is filtered client-side from ?category=, so this page and every
 * category "view" of it shared one title and one description. Reading the
 * param here gives each category its own indexable metadata, targeted at the
 * Georgian buying terms for that category (see CATEGORY_SEO in lib/seo.ts).
 */
export async function generateMetadata({
  params: { locale },
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const loc = locale as Locale;
  const isKa = loc === 'ka';
  const categorySlug = searchParams.category;

  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    // A thrown error here would lose the whole <head> for this page, so the
    // count is best-effort: if it can't be read we index the page rather than
    // silently hiding a stocked category from search.
    let productCount = 1;
    if (category) {
      try {
        const counts = await getCategoryProductCounts();
        productCount = counts[category.slug] ?? 0;
      } catch {
        productCount = 1;
      }
    }
    if (category) {
      const { title, description } = categorySeo(category, loc);
      return pageMetadata({
        title,
        description,
        path: `/products?category=${category.slug}`,
        locale: loc,
        // An empty category is a thin page. It stays reachable for shoppers
        // browsing the nav, but is kept out of the index until it holds stock —
        // a set of empty category pages drags on sitewide quality signals.
        noindex: productCount === 0,
      });
    }
  }

  // A brand filter is a narrow slice of the same listing; canonicalise it to
  // the unfiltered page rather than indexing a near-duplicate per brand.
  if (searchParams.brand) {
    return pageMetadata({
      title: isKa
        ? `მობილურის აქსესუარები | ${SITE_NAME}`
        : `Mobile Accessories | ${SITE_NAME}`,
      description: isKa
        ? 'დამტენები, კაბელები, ქეისები და ყურსასმენები — ბრენდების მიხედვით.'
        : 'Chargers, cables, cases and headphones, filtered by brand.',
      path: '/products',
      locale: loc,
      noindex: true,
    });
  }

  return pageMetadata({
    title: isKa
      ? `მობილურის აქსესუარები — დამტენი, კაბელი, ქეისი`
      : `Mobile Accessories — Chargers, Cables, Cases`,
    description: isKa
      ? 'ტელეფონის დამტენი, Type-C კაბელი, ტელეფონის ქეისი, პაუერ ბანკი და უსადენო ყურსასმენები. მიტანა თბილისში და საქართველოში.'
      : 'Phone chargers, Type-C cables, phone cases, power banks and wireless earbuds. Delivery in Tbilisi and across Georgia.',
    path: '/products',
    locale: loc,
  });
}

export default async function ProductsPage({
  params: { locale },
  searchParams,
}: ProductsPageProps) {
  setRequestLocale(locale);

  const [products, categories, brands, counts] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
    getCategoryProductCounts(),
  ]);

  // Brand → product slugs, resolved server-side: a device brand also matches on
  // specs.Compatibility via compatTerms, which the client has no access to.
  const brandProductEntries = await Promise.all(
    brands.map(async (b) => [b.slug, (await getProductsByBrand(b.slug)).map((p) => p.slug)] as const),
  );

  const loc = locale as Locale;
  const isKa = loc === 'ka';
  const activeCategory = searchParams.category
    ? categories.find((c) => c.slug === searchParams.category)
    : undefined;

  // Server-rendered heading + intro copy.
  //
  // The client component owns the interactive H1, but it renders inside a
  // Suspense boundary that reads useSearchParams — so it is absent from the
  // HTML a crawler receives, and this page shipped with no H1 at all. This
  // block is the crawlable heading; the visible filtered UI follows below.
  const heading = activeCategory
    ? categorySeo(activeCategory, loc).heading
    : isKa
      ? 'მობილურის აქსესუარები'
      : 'Mobile Accessories';

  const intro = activeCategory
    ? categorySeo(activeCategory, loc).description
    : isKa
      ? 'ტელეფონის დამტენი, Type-C კაბელი, ტელეფონის ქეისი, პაუერ ბანკი და უსადენო ყურსასმენები — ორიგინალი ხარისხი, მიტანით თბილისში და მთელ საქართველოში.'
      : 'Phone chargers, Type-C cables, phone cases, power banks and wireless earbuds — quality guaranteed, with delivery in Tbilisi and across Georgia.';

  const crumbs = [
    { name: isKa ? 'მთავარი' : 'Home', path: '/' },
    { name: isKa ? 'პროდუქტები' : 'Products', path: '/products' },
    ...(activeCategory
      ? [
          {
            name: isKa ? activeCategory.nameKa : activeCategory.nameEn,
            path: `/products?category=${activeCategory.slug}`,
          },
        ]
      : []),
  ];

  // Products the crawler should associate with this listing.
  const listed = activeCategory
    ? products.filter((p) => p.category === activeCategory.slug)
    : products;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs, loc),
          itemListJsonLd(listed.slice(0, 50), loc),
        ]}
      />

      {/* Crawlable heading + copy. Visually hidden so the existing filtered
          UI below stays the design of record — this is the same content the
          client H1 shows, not cloaked or keyword-stuffed alternate text. */}
      <div className="sr-only">
        <h1>{heading}</h1>
        <p>{intro}</p>
        {activeCategory && (
          <p>
            {isKa
              ? `${counts[activeCategory.slug] ?? 0} პროდუქტი ამ კატეგორიაში.`
              : `${counts[activeCategory.slug] ?? 0} products in this category.`}
          </p>
        )}
        <ul>
          {listed.slice(0, 50).map((p) => (
            <li key={p.slug}>
              <a href={`/${locale}/products/${p.slug}`}>{isKa ? p.nameKa : p.nameEn}</a>
            </li>
          ))}
        </ul>
      </div>

      <ProductsPageClient
        products={products}
        categories={categories}
        brands={brands}
        brandProducts={Object.fromEntries(brandProductEntries)}
      />
    </>
  );
}
