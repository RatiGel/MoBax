/**
 * Renders a JSON-LD block into the page.
 *
 * Server component by design: structured data must be present in the HTML the
 * crawler receives, so this must never be deferred to a client effect.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is inserted verbatim. `<` is escaped so a stray
      // "</script>" inside product copy can't break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
