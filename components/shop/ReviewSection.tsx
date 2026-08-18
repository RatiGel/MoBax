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
    <section className="mt-24 pt-12 border-t border-border-light dark:border-border-dark">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-10">
        <h2 className="font-display font-semibold tracking-display text-2xl text-ink dark:text-white">
          {t('title')}
        </h2>
        {data.count > 0 && (
          <div className="flex items-center gap-3">
            <StarRating rating={data.averageRating} reviewCount={data.count} emptyLabel={false} />
            <span className="text-xs text-graphite">
              {t('basedOn', { count: data.count })}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* ── Reviews list ── */}
        <div>
          {data.reviews.length === 0 ? (
            <p className="text-sm text-graphite">{t('noReviews')}</p>
          ) : (
            <ul className="space-y-4">
              {data.reviews.map((r) => (
                <li
                  key={r._id}
                  className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <StarRating rating={r.rating} size="sm" emptyLabel={false} />
                    {r.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {t('verified')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-ink dark:text-neutral-100">
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-graphite leading-relaxed">
                    {r.body}
                  </p>
                  <p className="mt-2 text-xs text-graphite/70">
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
          <h3 className="mb-5 font-display font-semibold text-lg text-ink dark:text-white">
            {t('writeReview')}
          </h3>

          {status !== 'authenticated' ? (
            <div className="rounded-2xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-6 text-center">
              <p className="mb-4 text-sm text-graphite">{t('loginPrompt')}</p>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/${locale}/login`}>{t('signIn')}</Link>
              </Button>
            </div>
          ) : submitted ? (
            <div className="rounded-2xl border border-success/40 bg-success/5 p-6 text-sm text-ink dark:text-neutral-300">
              {t('pendingNotice')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="mb-2 block text-graphite">{t('ratingLabel')}</Label>
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
                            ? 'h-6 w-6 fill-ink text-ink dark:fill-white dark:text-white'
                            : 'h-6 w-6 text-border-light dark:text-border-dark'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="review-title" className="mb-2 block text-graphite">
                  {t('reviewTitle')}
                </Label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('reviewTitlePlaceholder')}
                  maxLength={160}
                  required
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="review-body" className="mb-2 block text-graphite">
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
                  className="rounded-xl"
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <Button type="submit" className="rounded-full font-semibold" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
