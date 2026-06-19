'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { Star, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/shop/StarRating';

interface Review {
  _id: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  count: number;
}

export function ReviewSection({ productSlug }: { productSlug: string }) {
  const locale = useLocale();
  const t = useTranslations('reviews');
  const { status } = useSession();

  const [data, setData] = useState<ReviewsResponse>({ reviews: [], averageRating: 0, count: 0 });
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/${productSlug}`);
      const json = await res.json();
      if (json && Array.isArray(json.reviews)) setData(json);
    } catch {
      /* keep empty state */
    }
  }, [productSlug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productSlug, rating, title, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to submit review');
        return;
      }
      setSubmitted(true);
      setTitle('');
      setBody('');
      setRating(5);
    } catch {
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-24 pt-12 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-10">
        <h2 className="font-display text-2xl font-bold text-neutral-950 dark:text-white">
          {t('title')}
        </h2>
        {data.count > 0 && (
          <div className="flex items-center gap-3">
            <StarRating rating={data.averageRating} reviewCount={data.count} />
            <span className="text-xs text-neutral-400">
              {t('basedOn', { count: data.count })}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* ── Reviews list ── */}
        <div>
          {data.reviews.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('noReviews')}</p>
          ) : (
            <ul className="space-y-6">
              {data.reviews.map((r) => (
                <li
                  key={r._id}
                  className="border-b border-neutral-100 dark:border-neutral-800 pb-6 last:border-0"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <StarRating rating={r.rating} size="sm" />
                    {r.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {t('verified')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {r.body}
                  </p>
                  <p className="mt-2 text-xs text-neutral-400">
                    {r.userName} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Write a review ── */}
        <div>
          <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-900 dark:text-neutral-100">
            {t('writeReview')}
          </h3>

          {status !== 'authenticated' ? (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center">
              <p className="mb-4 text-sm text-neutral-500">{t('loginPrompt')}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/login`}>{t('signIn')}</Link>
              </Button>
            </div>
          ) : submitted ? (
            <div className="rounded-lg border border-success/40 bg-success/5 p-6 text-sm text-neutral-700 dark:text-neutral-300">
              {t('pendingNotice')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="mb-2 block">{t('ratingLabel')}</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${n} star`}
                    >
                      <Star
                        className={
                          n <= (hover || rating)
                            ? 'h-6 w-6 fill-accent text-accent'
                            : 'h-6 w-6 text-neutral-300'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="review-title" className="mb-2 block">
                  {t('reviewTitle')}
                </Label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('reviewTitlePlaceholder')}
                  maxLength={160}
                  required
                />
              </div>

              <div>
                <Label htmlFor="review-body" className="mb-2 block">
                  {t('reviewBody')}
                </Label>
                <Textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('reviewBodyPlaceholder')}
                  rows={4}
                  maxLength={5000}
                  required
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <Button type="submit" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
