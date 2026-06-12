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
    { slug: 'original', nameEn: '100% Original', nameKa: '100% ორიგინალი' },
  ];

  return (
    <footer className="bg-primary text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href={`/${locale}`} className="inline-flex items-center mb-5">
              <span className="font-display text-2xl font-bold text-white tracking-tight">Mo</span>
              <span className="font-display text-2xl font-bold text-accent tracking-tight">Bax</span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400 max-w-xs">{t('tagline')}</p>

            <div className="flex gap-3 mt-7">
              <a
                href="#"
                aria-label="Instagram"
                className="h-9 w-9 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:border-accent hover:text-accent transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="h-9 w-9 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:border-accent hover:text-accent transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="h-9 w-9 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:border-accent hover:text-accent transition-colors text-xs font-bold"
              >
                TT
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-200 mb-5">
              {t('shop')}
            </h3>
            <ul className="space-y-3">
              {shopLinks.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${locale}/products?category=${cat.slug}`}
                    className="text-sm hover:text-accent transition-colors"
                  >
                    {locale === 'ka' ? cat.nameKa : cat.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-200 mb-5">
              {t('company')}
            </h3>
            <ul className="space-y-3">
              {[t('about'), t('contact'), t('privacy'), t('terms')].map((item) => (
                <li key={item}>
                  <span className="text-sm cursor-default hover:text-accent transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-200 mb-5">
              {locale === 'ka' ? 'კონტაქტი' : 'Contact'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>📍 {locale === 'ka' ? 'თბილისი, საქართველო' : 'Tbilisi, Georgia'}</li>
              <li>
                <a href="tel:+995555123456" className="hover:text-accent transition-colors">
                  +995 555 123 456
                </a>
              </li>
              <li>
                <a href="mailto:hello@mobax.ge" className="hover:text-accent transition-colors">
                  hello@mobax.ge
                </a>
              </li>
              <li className="text-neutral-600 text-xs">10:00 – 22:00</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="text-xs text-neutral-600 order-2 sm:order-1">
            © {new Date().getFullYear()} MoBax. {t('rights')}.
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {['VISA', 'MC', '🍎 Pay', 'G Pay', 'BOG', 'TBC'].map((method) => (
              <span
                key={method}
                className="border border-primary text-neutral-500 text-[10px] font-medium px-2 py-1 rounded"
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
