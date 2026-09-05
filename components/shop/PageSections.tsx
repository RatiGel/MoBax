/**
 * Storefront renderer for admin-authored page sections (Admin → Content →
 * About / Contact / Privacy / Terms). The shapes rendered here are the ones
 * declared in `lib/page-sections.ts` — that module is the source of truth for
 * what each `content` blob holds, and this file must track it.
 *
 * Everything arriving here is untrusted Mixed JSON, so every field is read
 * through `pickLocalized` / `pickPlain` and every block degrades to nothing
 * rather than rendering an empty shell. A section whose required text is
 * missing is skipped outright — a half-empty hero looks broken, an absent one
 * just reads as a shorter page.
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import type { SectionType } from '@/models/Page';
import {
  pickLocalized,
  pickPlain,
  type PageSectionContent,
} from '@/lib/page-content';

/** A `content` blob plus the locale it should be read in. */
interface SectionProps {
  content: Record<string, unknown>;
  locale: string;
}

/**
 * Admin-entered links may be internal ('/products') or external. Internal ones
 * need the locale prefix the storefront routes on; external ones are handed to
 * a plain anchor so they are not run through the router.
 */
function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

function localizedHref(href: string, locale: string): string {
  if (isExternal(href)) return href;
  const path = href.startsWith('/') ? href : `/${href}`;
  // Already prefixed (e.g. '/ka/products') — leave it alone.
  if (/^\/(en|ka)(\/|$)/.test(path)) return path;
  return `/${locale}${path}`;
}

function SectionLink({
  href,
  locale,
  className,
  children,
}: {
  href: string;
  locale: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={localizedHref(href, locale)} className={className}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Section kinds
 * ------------------------------------------------------------------ */

function HeroSection({ content, locale }: SectionProps) {
  const heading = pickLocalized(content, 'heading', locale);
  if (!heading) return null;

  const badge = pickLocalized(content, 'badge', locale);
  const subheading = pickLocalized(content, 'subheading', locale);
  const image = pickPlain(content, 'image');
  const rating = pickPlain(content, 'rating');
  const trust = pickLocalized(content, 'trust', locale);
  const ctaLabel = pickLocalized(content, 'ctaLabel', locale);
  const ctaHref = pickPlain(content, 'ctaHref');
  const ctaSecondaryLabel = pickLocalized(content, 'ctaSecondaryLabel', locale);
  const ctaSecondaryHref = pickPlain(content, 'ctaSecondaryHref');

  return (
    <section className="border-b border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          {badge && (
            <span className="inline-flex rounded-full bg-cobalt-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-amber-ink dark:bg-cloud-dark">
              {badge}
            </span>
          )}
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-display text-ink dark:text-white sm:text-5xl">
            {heading}
          </h1>
          {subheading && (
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-graphite">{subheading}</p>
          )}

          {(rating || trust) && (
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-graphite">
              {rating && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink dark:text-white">
                  <Star className="h-4 w-4 fill-current text-amber-ink" aria-hidden="true" />
                  {rating}
                </span>
              )}
              {trust && <span>{trust}</span>}
            </div>
          )}

          {((ctaLabel && ctaHref) || (ctaSecondaryLabel && ctaSecondaryHref)) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {ctaLabel && ctaHref && (
                <SectionLink
                  href={ctaHref}
                  locale={locale}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-ink"
                >
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </SectionLink>
              )}
              {ctaSecondaryLabel && ctaSecondaryHref && (
                <SectionLink
                  href={ctaSecondaryHref}
                  locale={locale}
                  className="inline-flex items-center gap-2 rounded-full border border-border-light px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cloud-light dark:border-border-dark dark:text-white dark:hover:bg-cloud-dark"
                >
                  {ctaSecondaryLabel}
                </SectionLink>
              )}
            </div>
          )}
        </div>

        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border-light dark:border-border-dark">
            <Image
              src={image}
              alt={heading}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Long-form prose. Admins type plain text with blank lines between paragraphs,
 * so newlines are the only structure honoured here — the value is rendered as
 * text, never as HTML.
 */
function TextSection({ content, locale }: SectionProps) {
  const body = pickLocalized(content, 'body', locale);
  if (!body) return null;

  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="space-y-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line text-base leading-relaxed text-graphite">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function BannerSection({ content, locale }: SectionProps) {
  const heading = pickLocalized(content, 'heading', locale);
  const body = pickLocalized(content, 'body', locale);
  if (!heading && !body) return null;

  const image = pickPlain(content, 'image');
  const href = pickPlain(content, 'href');

  const inner = (
    <div className="grid items-center gap-8 sm:grid-cols-2">
      <div className="p-8 sm:p-10">
        {heading && (
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
            {heading}
          </h2>
        )}
        {body && <p className="mt-3 text-sm leading-relaxed text-graphite">{body}</p>}
        {href && (
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-ink">
            {locale === 'ka' ? 'გაიგეთ მეტი' : 'Learn more'}
            <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
      {image && (
        <div className="relative aspect-[16/10] h-full w-full overflow-hidden sm:rounded-r-3xl">
          <Image
            src={image}
            alt={heading ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
        {href ? (
          <SectionLink href={href} locale={locale} className="block transition-shadow hover:shadow-xl hover:shadow-ink/5">
            {inner}
          </SectionLink>
        ) : (
          inner
        )}
      </div>
    </section>
  );
}

/**
 * The FAQ *list* lives in the `faq` admin setting, not in this section — the
 * section itself only carries an intro blurb (see `SECTION_SCHEMAS.faq`).
 * Rendering the list here would duplicate the home page's `FaqSection`, so
 * this stays an intro block and nothing more.
 */
function FaqIntroSection({ content, locale }: SectionProps) {
  const intro = pickLocalized(content, 'intro', locale);
  if (!intro) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-base leading-relaxed text-graphite">{intro}</p>
    </section>
  );
}

/**
 * `grid` carries a heading and layout hints only; its `showCategories` flag is
 * a home-page concern (the categories grid there is built from the catalog).
 * On a content page there is no item source, so this renders the heading as a
 * section divider and nothing else — better than an empty grid.
 */
function GridSection({ content, locale }: SectionProps) {
  const heading = pickLocalized(content, 'heading', locale);
  if (!heading) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
        {heading}
      </h2>
    </section>
  );
}

const RENDERERS: Record<SectionType, (props: SectionProps) => JSX.Element | null> = {
  hero: HeroSection,
  text: TextSection,
  banner: BannerSection,
  faq: FaqIntroSection,
  grid: GridSection,
};

/** Render a page's visible sections in order. Unknown kinds are skipped. */
export function PageSections({
  sections,
  locale,
}: {
  sections: PageSectionContent[];
  locale: string;
}) {
  return (
    <>
      {sections.map((section, i) => {
        const Renderer = RENDERERS[section.type];
        if (!Renderer) return null;
        return <Renderer key={`${section.type}-${i}`} content={section.content} locale={locale} />;
      })}
    </>
  );
}
