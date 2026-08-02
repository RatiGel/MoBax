import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductPageProps {
  params: { slug: string; locale: string };
}

// Storefront reads the DB; ISR keeps it cheap. Admin catalog writes call
// revalidateStorefront(), so edits land immediately rather than within 60s.
export const revalidate = 60;

export default async function ProductPage({ params: { slug, locale } }: ProductPageProps) {
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  if (!product) return notFound();

  const related = await getRelatedProducts(product);

  return <ProductDetailClient product={product} related={related} />;
}
