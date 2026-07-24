/**
 * Live store FAQ — bridge between the admin Content page (FAQ editor) and the
 * public storefront home page. The admin saves an ordered array of bilingual
 * Q&A items to the FAQ setting; the home page reads it on the server. Mirrors
 * `lib/theme.ts`: never throws, so a DB hiccup falls back to an empty list and
 * the caller renders its own hardcoded default instead.
 */

import Setting, { SETTING_KEYS } from '@/models/Setting';
import { connectDB } from '@/lib/mongodb';
import type { FaqItem } from '@/lib/validations';

function isFaqItem(v: unknown): v is FaqItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.questionEn === 'string' &&
    typeof o.questionKa === 'string' &&
    typeof o.answerEn === 'string' &&
    typeof o.answerKa === 'string'
  );
}

/**
 * Fetch the saved FAQ items. Returns `[]` when unset, empty, or on any error —
 * the storefront treats an empty list as "use the built-in fallback FAQ".
 */
export async function getStoreFaq(): Promise<FaqItem[]> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: SETTING_KEYS.FAQ }).lean();
    const value = setting?.value;
    if (Array.isArray(value)) {
      return value.filter(isFaqItem);
    }
  } catch (err) {
    console.error('[getStoreFaq]', err);
  }
  return [];
}
