/**
 * Sets <html lang> to the active locale.
 *
 * The root layout can't read the locale param (and must not read headers() —
 * that would opt the whole storefront out of ISR), so it ships lang="ka".
 * This corrects it for /en.
 *
 * This runs as a blocking inline script rather than a useEffect: search
 * crawlers and social scrapers read the served HTML and many never execute
 * React hydration, so the effect-based version left every English page
 * declaring lang="ka". The script is a server-rendered <script> tag, so the
 * attribute is right before first paint and before any crawler that runs
 * scripts at all evaluates the document.
 *
 * `locale` is validated against the allow-list in app/[locale]/layout.tsx
 * before this renders, so it is never attacker-controlled — but it is still
 * JSON-encoded rather than interpolated raw.
 */
export function HtmlLang({ locale }: { locale: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.lang=${JSON.stringify(locale)}`,
      }}
    />
  );
}
