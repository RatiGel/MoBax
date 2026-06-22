import crypto from 'node:crypto';

/**
 * Flitt SHA1 signature — TS port of the gateway's documented algorithm.
 *
 * Build string: secret | <non-empty values, sorted by key, joined with "|">
 * then SHA1 the UTF-8 bytes, lowercase hex.
 *
 * Rules (must match Flitt exactly or it returns "Invalid signature"):
 *  - sort params alphabetically by key
 *  - exclude `signature` and `response_signature_string`
 *  - omit empty / null / undefined values entirely (including their separator)
 *  - preserve numeric 0 (it is NOT empty)
 *  - booleans render as "true"/"false"; everything else via String()
 */

const EXCLUDED_KEYS = new Set(['signature', 'response_signature_string']);

export type FlittParams = Record<string, string | number | boolean | null | undefined>;

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function stringify(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** The pre-hash string. Exposed for debugging signature mismatches. */
export function flittSignatureString(secret: string, params: FlittParams): string {
  const values = Object.keys(params)
    .filter((key) => !EXCLUDED_KEYS.has(key) && isPresent(params[key]))
    .sort()
    .map((key) => stringify(params[key] as string | number | boolean));
  return [secret, ...values].join('|');
}

export function flittSignature(secret: string, params: FlittParams): string {
  return crypto
    .createHash('sha1')
    .update(flittSignatureString(secret, params), 'utf8')
    .digest('hex');
}

/** Constant-time compare a received signature against the recomputed one. */
export function verifyFlittSignature(
  secret: string,
  params: FlittParams,
  received: string | undefined | null
): boolean {
  if (!received) return false;
  const expected = flittSignature(secret, params);
  const a = Buffer.from(expected);
  const b = Buffer.from(received.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
