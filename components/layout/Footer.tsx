import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Instagram, Facebook } from 'lucide-react';
import type { FooterSettings } from '@/lib/theme';
import type { NavbarBranding } from './Navbar';

export function Footer({
  footerSettings,
  branding,
}: {
  footerSettings?: FooterSettings;
  branding?: NavbarBranding;
}) {
  const locale = useLocale();
  const t = useTranslations('footer');

  // The footer sits on `bg-ink` in both themes, so unlike the Navbar it does
  // not swap logos — the white wordmark is the only legible one here. An
  // admin-uploaded logo still wins, and a renamed store with no logo of its
  // own falls through to the text wordmark below (matched case-insensitively;
  // the seeded name is "MOBAX").
  const storeName = branding?.storeName?.trim() || 'MoBax';
  const customLogoUrl = branding?.logoUrl?.trim() || '';
  const logoUrl = customLogoUrl || '/images/logo-dark.png';
  const useLogoImage = Boolean(customLogoUrl) || storeName.toLowerCase() === 'mobax';

  const shopLinks = [
    { slug: 'phone-protection', nameEn: 'Phone Protection', nameKa: 'ტელეფონის დაცვა' },
    { slug: 'chargers', nameEn: 'Chargers', nameKa: 'დამტენები' },
    { slug: 'headphones-speakers', nameEn: 'Headphones', nameKa: 'ყურსასმენები' },
    { slug: 'car-accessories', nameEn: 'Car Accessories', nameKa: 'ავტო აქსესუარები' },
    { slug: 'computer-accessories', nameEn: 'Computer', nameKa: 'კომპიუტერი' },
    { slug: 'original', nameEn: 'Genuine Products', nameKa: 'ორიგინალი პროდუქცია' },
  ];

  // Company links point at the admin-authored content pages
  // (app/[locale]/(shop)/[pageKey]), whose slugs are the `Page` model's
  // pageKeys — keep these in sync with CONTENT_PAGES in that route.
  const companyLinks = [
    { slug: 'about', label: t('about') },
    { slug: 'contact', label: t('contact') },
    { slug: 'privacy', label: t('privacy') },
    { slug: 'terms', label: t('terms') },
  ];

  // Saved settings win when present; nothing may disappear before the
  // settings are first saved, so every field falls back independently to
  // today's hardcoded content rather than the whole footer flipping at once.
  const savedColumns = footerSettings?.columns ?? [];
  const savedSocial = footerSettings?.social ?? [];
  const contact = footerSettings?.contact;
  const phone = contact?.phone?.trim() || '+995 555 123 456';
  const email = contact?.email?.trim() || 'hello@mobax.ge';
  const addressEn = contact?.addressEn?.trim() || 'Tbilisi, Georgia';
  const addressKa = contact?.addressKa?.trim() || 'თბილისი, საქართველო';

  return (
    <footer className="bg-ink text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href={`/${locale}`} className="inline-flex items-center mb-5">
              {useLogoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={storeName} className="h-9 w-auto max-w-[180px] object-contain" />
              ) : (
                <>
                  <span className="font-display text-2xl font-semibold text-white tracking-display">Mo</span>
                  <span className="font-display text-2xl font-semibold text-cobalt-dark tracking-display">Bax</span>
                </>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400 max-w-xs">{t('tagline')}</p>

            <div className="flex gap-3 mt-7">
              {savedSocial.length > 0 ? (
                savedSocial.map((s, i) => (
                  <a
                    key={`${s.platform}-${i}`}
                    href={s.url}
                    aria-label={s.platform}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-400 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
                  >
                    <SocialIcon platform={s.platform} />
                  </a>
                ))
              ) : (
                <>
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-400 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-400 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a
                    href="#"
                    aria-label="TikTok"
                    className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 text-neutral-400 hover:border-cobalt-dark hover:text-cobalt-dark hover:bg-white/5 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.95a5.78 5.78 0 0 0-.77-.05A5.78 5.78 0 1 0 15.34 15.7V9.18a7.5 7.5 0 0 0 4.37 1.4V7.4a4.28 4.28 0 0 1-3.11-1.58Z" />
                    </svg>
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-5">
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-5">
              {t('company')}
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/${locale}/${item.slug}`}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — saved contact fields win per-field; unset fields keep
              today's hardcoded value rather than the whole block disappearing. */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-5">
              {locale === 'ka' ? 'კონტაქტი' : 'Contact'}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>{locale === 'ka' ? addressKa : addressEn}</li>
              <li>
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-white transition-colors">
                  {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                  {email}
                </a>
              </li>
              <li className="text-neutral-400 text-xs">10:00 – 22:00</li>
            </ul>
          </div>

          {/* Admin-managed extra columns (Setting: footer) — appended after
              the built-in columns, never replacing them. */}
          {savedColumns.map((col, i) => (
            <div key={`${col.titleEn}-${i}`}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-5 break-words">
                {locale === 'ka' ? col.titleKa || col.titleEn : col.titleEn}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link, j) => (
                  <li key={`${link.href}-${j}`}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors break-words">
                      {locale === 'ka' ? link.labelKa || link.labelEn : link.labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="text-xs text-neutral-400 order-2 sm:order-1">
            © {new Date().getFullYear()} MoBax. {t('rights')}.
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            {['VISA', 'MC', 'Apple Pay', 'G Pay', 'BOG', 'TBC'].map((method) => (
              <span
                key={method}
                className="border border-white/10 text-neutral-400 text-[10px] font-medium px-2.5 py-1 rounded-md"
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

/** Best-effort icon for an admin-entered social platform name; unknown platforms get a generic glyph. */
function SocialIcon({ platform }: { platform: string }) {
  const p = platform.trim().toLowerCase();
  if (p.includes('instagram')) return <Instagram className="h-4 w-4" />;
  if (p.includes('facebook')) return <Facebook className="h-4 w-4" />;
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.2v12.86a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.95a5.78 5.78 0 0 0-.77-.05A5.78 5.78 0 1 0 15.34 15.7V9.18a7.5 7.5 0 0 0 4.37 1.4V7.4a4.28 4.28 0 0 1-3.11-1.58Z" />
    </svg>
  );
}
