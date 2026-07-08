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
  Star,
} from 'lucide-react';
import { getActiveServices, getServicePage } from '@/lib/services-data';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: Props) {
  return { title: `MoBax — ${locale === 'ka' ? 'სერვისები' : 'Services'}` };
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

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1200&h=1400&fit=crop';

export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const isKa = locale === 'ka';
  const t = await getTranslations('services');
  const [services, page] = await Promise.all([getActiveServices(), getServicePage()]);

  const heading = isKa ? page.headingKa : page.headingEn;
  const intro = isKa ? page.introKa : page.introEn;
  const address = isKa ? page.addressKa : page.addressEn;

  const stats = [
    { value: '5+', label: isKa ? 'წლიანი გამოცდილება' : 'Years of experience' },
    { value: '10k+', label: isKa ? 'დამუშავებული მოწყობილობა' : 'Devices serviced' },
    { value: '4.9', label: isKa ? 'საშუალო შეფასება' : 'Average rating' },
  ];

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
      title: isKa ? 'ჩვენ დავაფენთ' : 'We apply it',
      desc: isKa
        ? 'სპეციალისტი დააფენს ფილმას ზუსტად, უბუშტოდ, ლოდინის დროს.'
        : 'A specialist applies the film precisely and bubble-free while you wait.',
    },
    {
      icon: BadgeCheck,
      title: isKa ? 'მზადაა' : 'Ready to go',
      desc: isKa
        ? 'თქვენი მოწყობილობა დაცულია და გამზადებულია რამდენიმე წუთში.'
        : 'Your device leaves protected and polished in minutes.',
    },
  ];

  const perks = [
    {
      icon: Sparkles,
      title: isKa ? 'უხილავი დაცვა' : 'Invisible finish',
      desc: isKa ? 'ულტრათხელი ფენა, რომელიც არ ცვლის იერს.' : 'Ultra-thin layer that keeps the original look.',
    },
    {
      icon: ShieldCheck,
      title: isKa ? 'ნაკაწრებისგან დაცვა' : 'Scratch protection',
      desc: isKa ? 'ყოველდღიური ცვეთისგან საიმედო ფარი.' : 'A reliable shield against daily wear.',
    },
    {
      icon: Clock,
      title: isKa ? 'სწრაფი მომსახურება' : 'Fast turnaround',
      desc: isKa ? 'უმეტესი სამუშაო სრულდება 15 წუთში.' : 'Most jobs are done in under 15 minutes.',
    },
  ];

  const directionsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <div className="bg-paper dark:bg-ink">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-[460px] w-[460px] rounded-full bg-cobalt/10 blur-3xl dark:bg-cobalt-dark/10" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-light px-3.5 py-1.5 text-xs font-medium text-graphite dark:border-border-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
              {isKa ? 'ფილმის დაფენის სერვისი · თბილისი' : 'Film application service · Tbilisi'}
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-display text-ink dark:text-white sm:text-5xl lg:text-6xl">
              {heading}
            </h1>
            {intro && <p className="mt-5 max-w-xl text-lg leading-relaxed text-graphite">{intro}</p>}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-ink"
              >
                {t('sectionServices')}
              </a>
              {directionsHref && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border-light px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cloud-light dark:border-border-dark dark:text-white dark:hover:bg-cloud-dark"
                >
                  {t('getDirections')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Stats */}
            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border-light pt-8 dark:border-border-dark">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="font-display text-3xl font-semibold text-cobalt dark:text-cobalt-dark">
                    {s.value}
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-graphite">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero image */}
          <div className="animate-fade-up relative aspect-[4/5] overflow-hidden rounded-3xl border border-border-light shadow-2xl shadow-ink/10 dark:border-border-dark lg:aspect-[5/6]">
            <Image
              src={HERO_IMAGE}
              alt={isKa ? 'ფილმის დაფენა მოწყობილობაზე' : 'Applying protective film to a device'}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 backdrop-blur dark:bg-ink/80">
              <div className="flex items-center gap-0.5 text-cobalt dark:text-cobalt-dark">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-medium text-ink dark:text-white">
                {isKa ? '4.9 / 5 — 2,000+ შეფასება' : '4.9 / 5 — 2,000+ reviews'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────────────── */}
      <section className="border-y border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
            {isKa ? 'როგორ მუშაობს' : 'How it works'}
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalt-soft text-cobalt dark:bg-cloud-dark dark:text-cobalt-dark">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="mt-4 block font-display text-sm font-semibold text-cobalt dark:text-cobalt-dark">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-semibold text-ink dark:text-white">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-graphite">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services grid ────────────────────────────────── */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-light text-cobalt dark:bg-surface-dark dark:text-cobalt-dark">
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
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cobalt dark:text-cobalt-dark" />
                  <p className="text-graphite">{address}</p>
                </div>
              )}
              <div className="mt-4 flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cobalt dark:text-cobalt-dark" />
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
