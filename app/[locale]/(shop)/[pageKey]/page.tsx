/**
 * Public content pages — About, Contact, Privacy, Terms.
 *
 * These four are authored in Admin → Content and stored as `Page` docs; this
 * route is the only thing that renders them. `home` and `faq` are deliberately
 * NOT served here: `home` is `(shop)/page.tsx` and the FAQ list belongs to the
 * home page's `FaqSection`. Anything outside `CONTENT_PAGES` 404s so this
 * catch-all segment cannot swallow a mistyped storefront URL.
 *
 * A page with no saved sections renders a heading and a short "coming soon"
 * line rather than a blank screen — the footer links to these unconditionally,
 * so an unauthored page must still be a real page.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { PageKey } from '@/models/Page';
import { getPageSections, getPageSeo } from '@/lib/page-content';
import { PageSections } from '@/components/shop/PageSections';
import { pageMetadata, SITE_NAME, type Locale } from '@/lib/seo';

/** Page keys this route serves, and the built-in copy used before an admin authors them. */
const CONTENT_PAGES = {
  about: {
    titleEn: 'About Us',
    titleKa: 'ჩვენ შესახებ',
    descEn: `Learn about ${SITE_NAME} — a mobile accessories store in Tbilisi, Georgia.`,
    descKa: 'გაიგეთ მეტი MoBax-ის შესახებ — მობილური აქსესუარების მაღაზია თბილისში.',
  },
  contact: {
    titleEn: 'Contact',
    titleKa: 'კონტაქტი',
    descEn: `Get in touch with ${SITE_NAME} — address, phone, email and opening hours.`,
    descKa: 'დაგვიკავშირდით — მისამართი, ტელეფონი, ელ-ფოსტა და სამუშაო საათები.',
  },
  privacy: {
    titleEn: 'Privacy Policy',
    titleKa: 'კონფიდენციალურობის პოლიტიკა',
    descEn: `How ${SITE_NAME} collects, uses and protects your personal data.`,
    descKa: 'როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ თქვენს პერსონალურ მონაცემებს.',
  },
  terms: {
    titleEn: 'Terms of Service',
    titleKa: 'მომსახურების პირობები',
    descEn: `The terms that apply when you order from ${SITE_NAME}.`,
    descKa: 'პირობები, რომლებიც მოქმედებს MoBax-იდან შეკვეთისას.',
  },
} as const satisfies Record<string, { titleEn: string; titleKa: string; descEn: string; descKa: string }>;

type ContentPageKey = keyof typeof CONTENT_PAGES;

function isContentPageKey(value: string): value is ContentPageKey {
  return Object.prototype.hasOwnProperty.call(CONTENT_PAGES, value);
}

interface Props {
  params: { locale: string; pageKey: string };
}

// Prebuild the known pages in both locales; ISR keeps them fresh after an
// admin edit (mutating admin routes call revalidateStorefront()).
export function generateStaticParams() {
  return (['en', 'ka'] as const).flatMap((locale) =>
    (Object.keys(CONTENT_PAGES) as ContentPageKey[]).map((pageKey) => ({ locale, pageKey }))
  );
}

export const revalidate = 60;

export async function generateMetadata({ params: { locale, pageKey } }: Props): Promise<Metadata> {
  if (!isContentPageKey(pageKey)) return {};

  const isKa = locale === 'ka';
  const copy = CONTENT_PAGES[pageKey];
  // SEO fields are admin-editable (Admin → Content → <page> → SEO); blank or
  // unsaved falls back to the built-in copy above.
  const seo = await getPageSeo(pageKey as PageKey);

  return pageMetadata({
    title: seo?.title || `${isKa ? copy.titleKa : copy.titleEn} | ${SITE_NAME}`,
    description: seo?.description || (isKa ? copy.descKa : copy.descEn),
    path: `/${pageKey}`,
    locale: locale as Locale,
  });
}

export default async function ContentPage({ params: { locale, pageKey } }: Props) {
  if (!isContentPageKey(pageKey)) notFound();

  setRequestLocale(locale);
  const isKa = locale === 'ka';
  const copy = CONTENT_PAGES[pageKey];
  const sections = await getPageSections(pageKey as PageKey);

  // A hero section carries its own <h1>; without one the page still needs a
  // heading, so the built-in title stands in.
  const hasHero = sections.some((s) => s.type === 'hero');

  return (
    <div className="bg-paper dark:bg-ink">
      {!hasHero && (
        <header className="border-b border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-semibold tracking-display text-ink dark:text-white">
              {isKa ? copy.titleKa : copy.titleEn}
            </h1>
          </div>
        </header>
      )}

      {sections.length > 0 ? (
        <PageSections sections={sections} locale={locale} />
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-base leading-relaxed text-graphite">
            {isKa ? 'გვერდი მალე დაემატება.' : 'This page is coming soon.'}
          </p>
        </section>
      )}
    </div>
  );
}
