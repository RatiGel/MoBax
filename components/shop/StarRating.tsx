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
            star <= Math.round(rating) ? 'fill-accent text-accent' : 'text-neutral-300'
          )}
        />
      ))}
      <span className={cn('font-medium text-neutral-700 dark:text-neutral-300', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {rating}
      </span>
      {reviewCount !== undefined && (
        <span className={cn('text-neutral-400', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
