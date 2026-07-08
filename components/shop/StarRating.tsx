import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, reviewCount, size = 'md' }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <Star
          key={star}
          className={cn(
            iconClass,
            star <= Math.round(rating) ? 'fill-ink text-ink dark:fill-white dark:text-white' : 'text-border-light dark:text-border-dark'
          )}
        />
      ))}
      <span className={cn('font-medium text-ink dark:text-neutral-200', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {rating}
      </span>
      {reviewCount !== undefined && (
        <span className={cn('text-graphite', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
