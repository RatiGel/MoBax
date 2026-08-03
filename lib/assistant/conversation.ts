import type { CategorySlug } from '@/lib/types';

/**
 * What the assistant has learned about the shopper so far.
 *
 * The old route re-extracted a search query from the raw transcript on every
 * turn, so nothing accumulated: a device named three turns ago competed for
 * attention with everything said since, and a vague follow-up ("something
 * cheaper") lost the original context entirely. The profile is carried across
 * turns instead, and each turn merges new facts into it.
 */
export interface ShopperProfile {
  /** Phone/laptop the accessory is for, e.g. "iPhone 14 Pro". */
  device?: string;
  /** What kind of thing they want. */
  category?: CategorySlug;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Free-form wants: "wireless", "waterproof", "for the gym". */
  priorities?: string[];
  color?: string;
  /** Anything relevant that doesn't fit a slot above. */
  notes?: string;
}

export type AssistantAction = 'ask' | 'recommend';

export interface AssistantTurn {
  action: AssistantAction;
  profile: ShopperProfile;
  /** Present when action === 'ask'. */
  question?: string;
  /** Quick-reply chips for the question, so the shopper can tap not type. */
  options?: string[];
}

/**
 * Hard cap on clarifying questions before we must show something.
 *
 * A shopping assistant that keeps asking is worse than one that guesses:
 * the shopper came to buy, and an interrogation reads as a form. Two
 * questions is enough to get device + intent, which is what retrieval
 * actually needs. After that we recommend from whatever we have.
 */
export const MAX_QUESTIONS = 2;

/**
 * Is the profile rich enough to search with?
 *
 * Category alone is too thin for accessories — "a case" matches every case in
 * the catalog. Pairing it with a device (or an explicit budget/brand) is what
 * makes a recommendation feel chosen rather than dumped.
 */
export function profileIsActionable(profile: ShopperProfile): boolean {
  const signals = [
    profile.device,
    profile.category,
    profile.brand,
    profile.color,
    profile.priorities?.length ? 'priorities' : undefined,
    typeof profile.maxPrice === 'number' || typeof profile.minPrice === 'number'
      ? 'budget'
      : undefined,
  ].filter(Boolean);

  return signals.length >= 2;
}

/** Merge a freshly-extracted profile over the carried one. */
export function mergeProfile(
  prev: ShopperProfile,
  next: Partial<ShopperProfile>
): ShopperProfile {
  const merged: ShopperProfile = { ...prev };

  // Scalars: a new value replaces the old. Shoppers correct themselves
  // ("actually it's a 15 Pro"), and the newer statement is the true one.
  if (next.device) merged.device = next.device;
  if (next.category) merged.category = next.category;
  if (next.brand) merged.brand = next.brand;
  if (next.color) merged.color = next.color;
  if (next.notes) merged.notes = next.notes;
  if (typeof next.minPrice === 'number') merged.minPrice = next.minPrice;
  if (typeof next.maxPrice === 'number') merged.maxPrice = next.maxPrice;

  // Priorities accumulate — "waterproof" and "for running" are both true.
  if (next.priorities?.length) {
    merged.priorities = Array.from(
      new Set([...(prev.priorities ?? []), ...next.priorities])
    ).slice(0, 6);
  }

  return merged;
}

/** Keywords for retrieval, ordered so the strongest signal leads. */
export function profileToKeywords(profile: ShopperProfile): string[] {
  return [
    profile.device,
    profile.color,
    ...(profile.priorities ?? []),
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
}

/** Trim a transcript to the recent turns, so the prompt can't grow unbounded. */
export function recentTurns<T>(messages: T[], keep = 8): T[] {
  return messages.length <= keep ? messages : messages.slice(-keep);
}
