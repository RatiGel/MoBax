import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import {
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Clock,
  MapPin,
  CalendarCheck,
  Hand,
  BadgeCheck,
} from 'lucide-react';
import { getActiveServices, getServicePage, getActiveCatalogProducts } from '@/lib/services-data';
import { pageMetadata, SITE_NAME, type Locale } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isKa = locale === 'ka';
  // This page targets service queries ("დამცავი მინის დაკვრა") that the shop
  // can satisfy in store today without holding the matching stock.
  return pageMetadata({
    title: isKa
      ? `ეკრანის დამცავის დაკვრა და სერვისები | ${SITE_NAME}`
      : `Screen Protector Fitting & Services | ${SITE_NAME}`,
    description: isKa
      ? 'ეკრანის დამცავი მინის დაკვრა და ტელეფონის სერვისები ადგილზე, თბილისში. სწრაფად, გარანტიით.'
      : 'Screen protector fitting and phone services in store in Tbilisi. Fast, with warranty.',
    path: '/services',
    locale: locale as Locale,
  });
}

// Curated fallback imagery (Unsplash, allowed in next.config) used when a
// service has no admin-set image yet, keyed by position so the two seeded
// services get distinct, on-topic photos.
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop',
];

export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const isKa = locale === 'ka';
  const t = await getTranslations('services');
  const [services, page, catalog] = await Promise.all([
    getActiveServices(),
    getServicePage(),
    getActiveCatalogProducts(),
  ]);

  const address = isKa ? page.addressKa : page.addressEn;

  const steps = [
    {
      icon: CalendarCheck,
      title: isKa ? 'მოიტანეთ' : 'Bring it in',
      desc: isKa
        ? 'ეწვიეთ ჩვენს მაღაზიას თბილისში — ჯავშანი საჭირო არაა.'
        : 'Visit our Tbilisi store — no appointment needed.',
    },
    {
      icon: Hand,
      title: isKa ? 'ჩვენ დავაკრავთ' : 'We apply it',
      desc: isKa
        ? 'სერვისი ჩვენთან. სპეციალური აპარატი უზრუნველყოფს ნებისმიერი ტელეფონის ფირის მოჭრასა და ავტომატურ დაკვრას.'
        : 'A specialist applies the film precisely and bubble-free while you wait.',
    },
    {
      icon: BadgeCheck,
      title: isKa ? 'მზადაა' : 'Ready to go',
      desc: isKa
        ? 'რამდენიმე წუთში თქვენი მოწყობილობა დაცულია და მზადაა გამოყენებისთვის.'
        : 'Your device leaves protected and polished in minutes.',
    },
  ];

  const perks = [
    {
      icon: Sparkles,
      title: isKa ? 'უხილავი დაცვა' : 'Invisible finish',
      desc: isKa ? 'ულტრათხელი ფენა შეუმჩნეველია, თუმცა ეკრანს იცავს.' : 'Ultra-thin layer that keeps the original look.',
    },
    {
      icon: ShieldCheck,
      title: isKa ? 'ნაკაწრებისგან დაცვა' : 'Scratch protection',
      desc: isKa ? 'საიმედო დაცვა დავარდნისა და ნაკაწრებისგან.' : 'A reliable shield against daily wear.',
    },
    {
      icon: Clock,
      title: isKa ? 'სწრაფი მომსახურება' : 'Fast turnaround',
      desc: isKa ? 'ტელეფონი 15 წუთში მზადაა.' : 'Most jobs are done in under 15 minutes.',
    },
  ];

  const directionsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <div className="bg-paper dark:bg-ink">
      {/* ── Services grid ────────────────────────────────── */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-display text-ink dark:text-white">
            {t('sectionServices')}
          </h2>
        </div>

        {services.length === 0 ? (
          <p className="text-graphite">{t('noServices')}</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {services.map((s, i) => {
              const title = isKa ? s.titleKa : s.titleEn;
              const desc = isKa ? s.descriptionKa : s.descriptionEn;
              const img = s.image || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
              return (
                <article
                  key={s._id}
                  className="group overflow-hidden rounded-3xl border border-border-light bg-surface-light transition-shadow hover:shadow-xl hover:shadow-ink/5 dark:border-border-dark dark:bg-surface-dark"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={img}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-7">
                    <h3 className="font-display text-xl font-semibold text-ink dark:text-white">{title}</h3>
                    {desc && <p className="mt-3 text-sm leading-relaxed text-graphite">{desc}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Perks strip */}
        <div className="mt-14 grid gap-6 rounded-3xl border border-border-light bg-cloud-light/50 p-8 dark:border-border-dark dark:bg-cloud-dark/30 sm:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-light text-amber-ink dark:bg-surface-dark">
                <p.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink dark:text-white">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-graphite">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product catalog ──────────────────────────────── */}
      {catalog.length > 0 && (
        <section className="border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-display text-ink dark:text-white">
                {t('sectionCatalog')}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((c, i) => {
                const name = isKa ? c.nameKa : c.nameEn;
                const desc = isKa ? c.descriptionKa : c.descriptionEn;
                const img = c.images[0] || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
                return (
                  <article
                    key={c._id}
                    className="group overflow-hidden rounded-3xl border border-border-light bg-paper transition-shadow hover:shadow-xl hover:shadow-ink/5 dark:border-border-dark dark:bg-ink"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-lg font-semibold text-ink dark:text-white">{name}</h3>
                      {desc && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-graphite">{desc}</p>}
                      <p className="mt-3 font-semibold text-amber-ink">
                        {t('startsFrom', { price: c.priceFrom })}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Process ──────────────────────────────────────── */}
      <section className="border-y border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
            {isKa ? 'როგორ მუშაობს' : 'How it works'}
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalt-soft text-amber-ink dark:bg-cloud-dark">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="mt-4 block font-display text-sm font-semibold text-amber-ink">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-semibold text-ink dark:text-white">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-graphite">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Location ─────────────────────────────────────── */}
      {page.mapEmbedUrl && (
        <section className="border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-5 lg:px-8">
            <div className="lg:col-span-2">
              <h2 className="font-display text-3xl font-semibold tracking-display text-ink dark:text-white">
                {t('sectionLocation')}
              </h2>
              {address && (
                <div className="mt-6 flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink" />
                  <p className="text-graphite">{address}</p>
                </div>
              )}
              <div className="mt-4 flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-ink" />
                <p className="text-graphite">
                  {isKa ? 'ორშ–შაბ 11:00–20:00' : 'Mon–Sat 11:00–20:00'}
                </p>
              </div>
              {directionsHref && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-ink"
                >
                  {t('getDirections')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="overflow-hidden rounded-3xl border border-border-light dark:border-border-dark lg:col-span-3">
              <iframe
                src={page.mapEmbedUrl}
                className="h-[420px] w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="MoBax location"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
