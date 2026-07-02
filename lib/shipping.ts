/**
 * Single source of truth for delivery rules — shared by the checkout UI and the
 * order API so the fee the buyer sees always matches what's recorded.
 *
 * Model: the buyer picks a delivery METHOD. The available methods depend on the
 * delivery region, which is derived from the selected city (no geocoding — the
 * city dropdown is authoritative). Store Pickup is always free. All other fees
 * are paid in cash to the courier on delivery, NOT charged through the online
 * payment gateway — the gateway only charges the product subtotal.
 */

export type Region = 'tbilisi' | 'region';
export type DeliveryMethod = 'pickup' | 'instant' | 'nextday' | 'regional';

/**
 * Flat fee in GEL for the non-regional methods. Pickup is free; instant/nextday
 * are Tbilisi-only flat rates. Regional has NO flat fee — it varies per city
 * (see `regionalFee` on each CITIES entry); use `getDeliveryFee(method, city)`.
 */
export const DELIVERY_FEES: Record<DeliveryMethod, number> = {
  pickup: 0,
  instant: 10,
  nextday: 5,
  regional: 13, // fallback for unknown city / remote tier; real fee is per-city
};

/** Default regional fee (GEL) for a region city when none is specified. */
export const REGIONAL_FEE_DEFAULT = 13;

/**
 * City dropdown options. `region` buckets each city into the pricing zone.
 * Tbilisi is the only `tbilisi` entry; every other city maps to `region`.
 *
 * `regionalFee` is the courier-collected fee (GEL) for Regional Delivery to that
 * city and varies by distance/access: Rustavi 8, main cities 10, remote
 * villages / high-mountain ("other") 13. Tbilisi has no regional fee (it uses
 * instant/nextday), so the field is omitted there.
 */
export const CITIES: {
  value: string;
  region: Region;
  labelEn: string;
  labelKa: string;
  regionalFee?: number;
}[] = [
  { value: 'tbilisi', region: 'tbilisi', labelEn: 'Tbilisi', labelKa: 'თბილისი' },
  { value: 'rustavi', region: 'region', labelEn: 'Rustavi', labelKa: 'რუსთავი', regionalFee: 8 },
  { value: 'batumi', region: 'region', labelEn: 'Batumi', labelKa: 'ბათუმი', regionalFee: 10 },
  { value: 'kutaisi', region: 'region', labelEn: 'Kutaisi', labelKa: 'ქუთაისი', regionalFee: 10 },
  { value: 'gori', region: 'region', labelEn: 'Gori', labelKa: 'გორი', regionalFee: 10 },
  { value: 'zugdidi', region: 'region', labelEn: 'Zugdidi', labelKa: 'ზუგდიდი', regionalFee: 10 },
  { value: 'telavi', region: 'region', labelEn: 'Telavi', labelKa: 'თელავი', regionalFee: 10 },
  { value: 'poti', region: 'region', labelEn: 'Poti', labelKa: 'ფოთი', regionalFee: 10 },
  { value: 'khashuri', region: 'region', labelEn: 'Khashuri', labelKa: 'ხაშური', regionalFee: 10 },
  { value: 'samtredia', region: 'region', labelEn: 'Samtredia', labelKa: 'სამტრედია', regionalFee: 10 },
  { value: 'senaki', region: 'region', labelEn: 'Senaki', labelKa: 'სენაკი', regionalFee: 10 },
  { value: 'other', region: 'region', labelEn: 'Other region', labelKa: 'სხვა რეგიონი', regionalFee: 13 },
];

/** Region for a city value. Unknown values fall back to `region` (safer fee). */
export function getRegionForCity(cityValue: string): Region {
  return CITIES.find((c) => c.value === cityValue)?.region ?? 'region';
}

/**
 * Regional Delivery fee (GEL) for a city. Unknown cities fall back to the
 * remote-tier default — the conservative (higher) fee.
 */
export function getRegionalFee(cityValue: string): number {
  return CITIES.find((c) => c.value === cityValue)?.regionalFee ?? REGIONAL_FEE_DEFAULT;
}

/**
 * Methods available for a region. Pickup is always offered. Tbilisi adds
 * Instant + Next-day; other regions add Regional. Order = display order.
 */
export function getDeliveryMethods(region: Region): DeliveryMethod[] {
  return region === 'tbilisi' ? ['pickup', 'instant', 'nextday'] : ['pickup', 'regional'];
}

/**
 * Whether Instant (same-day) delivery can be booked at the given time:
 * orders placed 08:00–18:00, except Sundays. Pass a Date so callers control
 * the clock (and tests stay deterministic).
 */
export function isInstantAvailable(now: Date): boolean {
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();
  return day !== 0 && hour >= 8 && hour < 18;
}

/**
 * Fee for a method. Used by both the UI display and the server total. Regional
 * delivery varies per city, so pass `cityValue` — without it the regional fee
 * falls back to the remote-tier default. Other methods ignore the city.
 */
export function getDeliveryFee(method: DeliveryMethod, cityValue?: string): number {
  if (method === 'regional') return getRegionalFee(cityValue ?? '');
  return DELIVERY_FEES[method] ?? 0;
}

/**
 * Whether a method may be selected for a region at a given time. Guards the
 * server against a client sending e.g. `regional` for a Tbilisi address, or
 * `instant` outside its window.
 */
export function isMethodValid(method: DeliveryMethod, region: Region, now: Date): boolean {
  if (!getDeliveryMethods(region).includes(method)) return false;
  if (method === 'instant') return isInstantAvailable(now);
  return true;
}
