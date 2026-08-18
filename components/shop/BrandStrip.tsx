import Image from 'next/image';
import Link from 'next/link';
import type { Brand } from '@/lib/types';

interface BrandStripProps {
  brands: Brand[];
  locale: string;
  title: string;
  viewAllLabel: string;
}

/**
 * "All Brands" row on the home page.
 *
 * Renders a brand's logo when one has been uploaded (Admin → Brands) and a
 * type-set name when it hasn't. Every brand currently has an empty `logoUrl`,
 * and an empty logo slot reads as a broken image, so the wordmark is the
 * default state rather than a placeholder — the section upgrades itself per
 * brand as logos arrive, with no code change.
 *
 * Deliberately not a card grid: eight identical bordered boxes is the tell the
 * design brief calls out. A single ruled row reads as a roster.
 */
export function BrandStrip({ brands, locale, title, viewAllLabel }: BrandStripProps) {
  if (brands.length === 0) return null;

  return (
    <section className="border-t border-hairline-light bg-paper py-14 lg:py-20 dark:border-hairline-dark dark:bg-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink sm:text-3xl dark:text-white">
            {title}
          </h2>
          <Link
            href={`/${locale}/products`}
            className="shrink-0 text-sm font-medium text-graphite transition-colors hover:text-amber-ink"
          >
            {viewAllLabel}
          </Link>
        </div>

        {/* auto-fit rather than a fixed column count: the roster reflows from
            two-up on a phone to eight-up on a wide desktop without a
            breakpoint per step, and a partial final row stays even. */}
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline-light bg-hairline-light sm:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] dark:border-hairline-dark dark:bg-hairline-dark">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/${locale}/products?brand=${brand.slug}`}
                className="group flex h-24 items-center justify-center bg-panel-light px-4 transition-colors hover:bg-raised-light dark:bg-panel-dark dark:hover:bg-raised-dark"
              >
                {brand.logoUrl ? (
                  <span className="relative block h-8 w-full">
                    <Image
                      src={brand.logoUrl}
                      alt={brand.name}
                      fill
                      sizes="150px"
                      /* Logos arrive in mixed aspect ratios and colours;
                         `contain` keeps them whole instead of cropping. */
                      className="object-contain object-center"
                    />
                  </span>
                ) : (
                  <span className="text-center font-display text-base font-semibold tracking-wide text-graphite transition-colors group-hover:text-ink sm:text-lg dark:group-hover:text-white">
                    {brand.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
