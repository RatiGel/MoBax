import { setRequestLocale } from 'next-intl/server';
import { getProducts, getCategories, getBrands, getProductsByBrand } from '@/lib/catalog';
import { ProductsPageClient } from './ProductsPageClient';

export const revalidate = 60;

interface ProductsPageProps {
  params: { locale: string };
}

export default async function ProductsPage({ params: { locale } }: ProductsPageProps) {
  setRequestLocale(locale);

  const [products, categories, brands] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
  ]);

  // Brand → product slugs, resolved server-side: a device brand also matches on
  // specs.Compatibility via compatTerms, which the client has no access to.
  const brandProductEntries = await Promise.all(
    brands.map(async (b) => [b.slug, (await getProductsByBrand(b.slug)).map((p) => p.slug)] as const),
  );

  return (
    <ProductsPageClient
      products={products}
      categories={categories}
      brands={brands}
      brandProducts={Object.fromEntries(brandProductEntries)}
    />
  );
}
