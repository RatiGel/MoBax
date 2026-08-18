import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
  /**
   * What to show when nothing has been rated yet — five empty stars next to
   * "0 (0)" reads as a BAD rating rather than an absent one, which is
   * misleading on a catalogue where half the items are new.
   *
   * Required (or `false` to render nothing) rather than defaulting to an
   * English string: this component renders in both locales, and a hardcoded
   * default would silently break EN/KA parity. Callers pass
   * `t('noReviewsShort')`.
   */
  emptyLabel: string | false;
}

export function StarRating({ rating, reviewCount, size = 'md', emptyLabel }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  // Unrated: `reviewCount` of 0 and an explicit 0 rating both mean "no data".
  if (!reviewCount || rating <= 0) {
    if (emptyLabel === false) return null;
    return <span className={cn('text-graphite', textClass)}>{emptyLabel}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <Star
          key={star}
          className={cn(
            iconClass,
            star <= Math.round(rating)
              ? 'fill-cobalt text-cobalt'
              : 'text-hairline-light dark:text-hairline-dark'
          )}
        />
      ))}
      <span className={cn('font-medium tabular-nums text-ink dark:text-neutral-200', textClass)}>
        {rating}
      </span>
      <span className={cn('tabular-nums text-graphite', textClass)}>({reviewCount})</span>
    </div>
  );
}
