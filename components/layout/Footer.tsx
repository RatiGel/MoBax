import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Instagram, Facebook } from 'lucide-react';

export function Footer() {
  const locale = useLocale();
  const t = useTranslations('footer');

  const shopLinks = [
    { slug: 'phone-protection', nameEn: 'Phone Protection', nameKa: 'ტელეფონის დაცვა' },
    { slug: 'chargers', nameEn: 'Chargers', nameKa: 'დამტენები' },
    { slug: 'headphones-speakers', nameEn: 'Headphones', nameKa: 'ყურსასმენები' },
    { slug: 'car-accessories', nameEn: 'Car Accessories', nameKa: 'ავტო აქსესუარები' },
    { slug: 'computer-accessories', nameEn: 'Computer', nameKa: 'კომპიუტერი' },
    { slug: 'original', nameEn: 'Genuine Products', nameKa: 'ორიგინალი პროდუქცია' },
  ];

  return (
    <footer className="bg-ink text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href={`/${locale}`} className="inline-flex items-center mb-5">
              <span className="font-display text-2xl font-semibold text-white tracking-display">Mo</span>
              <span className="font-display text-2xl font-semibold text-cobalt-dark tracking-display">Bax</span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-500 max-w-xs">{t('tagline')}</p>

            <div className="flex gap-3 mt-7">
              <a
                href="#"
                aria-label="Instagram"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-500 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-500 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-500 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.95a5.78 5.78 0 0 0-.77-.05A5.78 5.78 0 1 0 15.34 15.7V9.18a7.5 7.5 0 0 0 4.37 1.4V7.4a4.28 4.28 0 0 1-3.11-1.58Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white mb-5">
              {t('shop')}
            </h3>
            <ul className="space-y-3">
              {shopLinks.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${locale}/products?category=${cat.slug}`}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {locale === 'ka' ? cat.nameKa : cat.nameEn}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/${locale}/services`} className="text-sm hover:text-white transition-colors">
                  {locale === 'ka' ? 'სერვისები' : 'Services'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white mb-5">
              {t('company')}
            </h3>
            <ul className="space-y-3">
              {[t('about'), t('contact'), t('privacy'), t('terms')].map((item) => (
                <li key={item}>
                  <span className="text-sm cursor-default hover:text-white transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white mb-5">
              {locale === 'ka' ? 'კონტაქტი' : 'Contact'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>{locale === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}</li>
              <li>
                <a href="tel:+995555123456" className="hover:text-white transition-colors">
                  +995 555 123 456
                </a>
              </li>
              <li>
                <a href="mailto:hello@mobax.ge" className="hover:text-white transition-colors">
                  hello@mobax.ge
                </a>
              </li>
              <li className="text-neutral-600 text-xs">10:00 – 22:00</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="text-xs text-neutral-600 order-2 sm:order-1">
            © {new Date().getFullYear()} MoBax. {t('rights')}.
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {['VISA', 'MC', 'Apple Pay', 'G Pay', 'BOG', 'TBC'].map((method) => (
              <span
                key={method}
                className="border border-white/10 text-neutral-500 text-[10px] font-medium px-2.5 py-1 rounded-md"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
