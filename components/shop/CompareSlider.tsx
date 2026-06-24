'use client';

import { useRouter } from 'next/navigation';
import { BeforeAfterSlider } from './BeforeAfterSlider';

interface CompareSliderProps {
  locale: string;
  beforeLabel: string;
  afterLabel: string;
}

/**
 * Home-page "See the Difference" comparison. Dragging the divider fully to the
 * left (toward the bare phone) redirects to the phone-cases category.
 */
export function CompareSlider({ locale, beforeLabel, afterLabel }: CompareSliderProps) {
  const router = useRouter();

  return (
    <BeforeAfterSlider
      beforeSrc="/compare/phone-naked.png"
      afterSrc="/compare/phone-cased.png"
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
      beforeAlt="Phone without case"
      afterAlt="Phone with premium case"
      onDragPastLeft={() => router.push(`/${locale}/products?category=phone-cases`)}
    />
  );
}
