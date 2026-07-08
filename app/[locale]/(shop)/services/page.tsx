import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getActiveServices, getServicePage } from '@/lib/services-data';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: Props) {
  return { title: `MoBax — ${locale === 'ka' ? 'სერვისები' : 'Services'}` };
}

export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const isKa = locale === 'ka';
  const t = await getTranslations('services');
  const [services, page] = await Promise.all([getActiveServices(), getServicePage()]);

  const heading = isKa ? page.headingKa : page.headingEn;
  const intro = isKa ? page.introKa : page.introEn;
  const address = isKa ? page.addressKa : page.addressEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-display text-ink dark:text-white sm:text-5xl">
          {heading}
        </h1>
        {intro && <p className="mt-4 text-lg text-graphite">{intro}</p>}
      </section>

      {/* Services grid */}
      <section className="mt-16">
        <h2 className="mb-8 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
          {t('sectionServices')}
        </h2>
        {services.length === 0 ? (
          <p className="text-graphite">{t('noServices')}</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {services.map((s) => {
              const title = isKa ? s.titleKa : s.titleEn;
              const desc = isKa ? s.descriptionKa : s.descriptionEn;
              return (
                <div
                  key={s._id}
                  className="overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
                >
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={title} className="aspect-video w-full object-cover" />
                  )}
                  <div className="p-6">
                    <h3 className="font-semibold text-ink dark:text-white">{title}</h3>
                    {desc && <p className="mt-2 text-sm text-graphite">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Location */}
      {page.mapEmbedUrl && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
            {t('sectionLocation')}
          </h2>
          {address && <p className="mb-4 text-graphite">{address}</p>}
          <div className="overflow-hidden rounded-2xl border border-border-light dark:border-border-dark">
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
        </section>
      )}
    </div>
  );
}
