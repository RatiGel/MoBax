'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { SocialVideo } from '@/lib/theme';

interface SocialVideosProps {
  videos: SocialVideo[];
  handle: string;
  profileUrl: string;
  locale: string;
  title: string;
  followLabel: string;
  watchLabel: string;
}

const TIKTOK_SCRIPT = 'https://www.tiktok.com/embed.js';

/**
 * Extract the numeric video id from a TikTok URL.
 *
 * Accepts the canonical `/@user/video/123` form and the `/embed/v2/123`
 * variant. Short share links (vm.tiktok.com/xxxx) can't be resolved without a
 * network call, so they're rejected here and surfaced as a link-out card
 * instead of a silently blank embed.
 */
export function parseTikTokId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/) ?? url.match(/\/embed(?:\/v\d)?\/(\d+)/);
  return match?.[1] ?? null;
}

/**
 * TikTok's embed.js rewrites every `blockquote.tiktok-embed` on the page into an
 * iframe. It only scans on load, so it has to be (re)invoked after our
 * blockquotes are in the DOM — hence the explicit `load()` call below.
 */
declare global {
  interface Window {
    tiktokEmbed?: { lib?: { render?: (nodes: Element[]) => void }; load?: () => void };
  }
}

export function SocialVideos({
  videos,
  handle,
  profileUrl,
  locale,
  title,
  followLabel,
  watchLabel,
}: SocialVideosProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Only load the third-party script once the section is near the viewport.
  // The embed is heavy and sits far down the page; loading it eagerly would
  // put a TikTok script on the critical path of every home page visit.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    // No IntersectionObserver (old browser, some headless renderers) → load
    // immediately rather than never. The content below is real markup either
    // way, so a missing observer degrades to "loads sooner", not "blank".
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;

    // Already loaded by a previous mount (client-side navigation): just ask
    // TikTok to re-scan for the new blockquotes.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TIKTOK_SCRIPT}"]`);
    if (existing) {
      window.tiktokEmbed?.load?.();
      return;
    }

    const script = document.createElement('script');
    script.src = TIKTOK_SCRIPT;
    script.async = true;
    document.body.appendChild(script);
    // Left in place on unmount: TikTok's script registers global state, and
    // removing it mid-session breaks embeds on a return visit to this page.
  }, [shouldLoad]);

  if (videos.length === 0) return null;

  return (
    <section className="border-t border-hairline-light bg-raised-light py-14 lg:py-20 dark:border-hairline-dark dark:bg-raised-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink sm:text-3xl dark:text-white">
            {title}
          </h2>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-graphite transition-colors hover:text-amber-ink"
            >
              {handle || followLabel}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </div>

        {/* `items-start` matters: TikTok's iframe sizes itself after load, and a
            stretched grid row would leave every shorter card padded out to the
            tallest embed. Aligning to the top keeps each card its own height.

            Columns are capped rather than `auto-fit, 1fr`: with one or two
            videos saved, auto-fit stretched a single portrait clip to the full
            1216px content width. A fixed max column width keeps a lone video at
            a sensible size and lets the row start from the left instead. */}
        <div
          ref={containerRef}
          className="grid grid-cols-1 items-start justify-start gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,340px))]"
        >
          {videos.map((video) => {
            const id = parseTikTokId(video.url);
            const caption = locale === 'ka' ? video.captionKa : video.captionEn;

            // Unparseable URL (e.g. a vm.tiktok.com short link): render a real
            // link rather than an embed that would silently stay blank.
            if (!id) {
              return (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[200px] flex-col justify-end rounded-lg border border-hairline-light bg-panel-light p-5 transition-colors hover:border-cobalt dark:border-hairline-dark dark:bg-panel-dark"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white">
                    {watchLabel}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {caption && <span className="mt-1 text-sm text-graphite">{caption}</span>}
                </a>
              );
            }

            return (
              <div key={video.id} className="overflow-hidden">
                {/* TikTok's own markup contract: embed.js looks for exactly
                    this element/attribute shape. The inner <a> is the
                    no-script fallback and is what shows until the script
                    swaps in the iframe, so the section is never blank. */}
                <blockquote
                  className="tiktok-embed"
                  cite={video.url}
                  data-video-id={id}
                  /* TikTok's embed has no Georgian locale, so the player chrome
                     ("Watch now", the share labels) stays English in both
                     locales. Set explicitly rather than left to the script's
                     default so the choice is visible here; our own caption
                     below it is fully localised. */
                  lang="en-US"
                  style={{ maxWidth: '100%', minWidth: 0 }}
                >
                  <section>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-ink"
                    >
                      {caption || watchLabel}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </section>
                </blockquote>
                {/* Caption sits OUTSIDE the blockquote. embed.js replaces that
                    whole element with an iframe once it loads, so anything
                    inside it is discarded — a caption placed there renders
                    only in the pre-script fallback and then vanishes, which
                    made the admin's caption fields look broken. */}
                {caption && (
                  <p className="mt-2 text-sm leading-snug text-graphite">{caption}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
