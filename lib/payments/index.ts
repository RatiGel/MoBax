/**
 * Payment provider — Flitt hosted checkout (single-pay model).
 *
 * MoBax charges once per order. The only method is FLITT: a server-to-server
 * call to Flitt's create-order endpoint returns a hosted `checkout_url`; we
 * redirect the buyer there. Flitt then POSTs an authoritative callback to
 * /api/payments/webhook (verified by SHA1 signature) which sets the order PAID.
 *
 * Amounts are sent to Flitt in MINOR UNITS (tetri = GEL * 100).
 *
 * To go live: swap FLITT_MERCHANT_ID / FLITT_PAYMENT_KEY env from the sandbox
 * test merchant (1549901 / "test") to the real merchant — no code change.
 */

import { flittSignature, type FlittParams } from './flitt-signature';

export const PAYMENT_METHODS = ['FLITT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === 'string' && (PAYMENT_METHODS as readonly string[]).includes(v);
}

export interface InitiateResult {
  /** Hosted-checkout URL to send the buyer to. */
  redirectUrl?: string;
  /** True when no gateway step is needed (unused in Flitt-only, kept for callers). */
  immediate?: boolean;
}

export class PaymentNotConfiguredError extends Error {
  constructor(method: PaymentMethod) {
    super(`Payment method ${method} is not configured. Add its credentials to env.`);
    this.name = 'PaymentNotConfiguredError';
  }
}

export class PaymentInitiationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentInitiationError';
  }
}

interface InitiateArgs {
  method: PaymentMethod;
  orderId: string;
  orderNumber: string;
  amount: number; // in GEL major units
  successUrl: string;
  failUrl: string;
}

const FLITT_CHECKOUT_URL = 'https://pay.flitt.com/api/checkout/url';
const CURRENCY = 'GEL';

export async function initiatePayment(args: InitiateArgs): Promise<InitiateResult> {
  switch (args.method) {
    case 'FLITT':
      return initiateFlitt(args);
    default:
      throw new Error(`Unknown payment method: ${args.method}`);
  }
}

async function initiateFlitt(args: InitiateArgs): Promise<InitiateResult> {
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secret = process.env.FLITT_PAYMENT_KEY;
  if (!merchantId || !secret) throw new PaymentNotConfiguredError('FLITT');

  // Flitt expects minor units (tetri). Round to avoid float drift.
  const amountMinor = Math.round(args.amount * 100);

  // Signed params. server_callback_url is authoritative; response_url is UX only.
  // Both success and fail land back on the order page via response_url; the
  // callback decides the real state. We pass our own success/fail handlers so a
  // browser-only return still updates UX optimistically.
  const params: FlittParams = {
    order_id: args.orderId,
    merchant_id: Number(merchantId),
    order_desc: `MoBax order ${args.orderNumber}`,
    amount: amountMinor,
    currency: CURRENCY,
    server_callback_url: process.env.FLITT_CALLBACK_URL || deriveCallbackUrl(args.successUrl),
    response_url: args.successUrl,
    lang: 'en',
  };
  params.signature = flittSignature(secret, params);

  let res: Response;
  try {
    res = await fetch(FLITT_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: params }),
    });
  } catch (err) {
    throw new PaymentInitiationError(
      `Flitt request failed: ${err instanceof Error ? err.message : 'network error'}`
    );
  }

  const data = (await res.json().catch(() => null)) as
    | { response?: { response_status?: string; checkout_url?: string; error_message?: string; error_code?: string | number } }
    | null;

  const response = data?.response;
  if (!response || response.response_status !== 'success' || !response.checkout_url) {
    const detail = response?.error_message || response?.error_code || `HTTP ${res.status}`;
    throw new PaymentInitiationError(`Flitt did not return a checkout URL: ${detail}`);
  }

  return { redirectUrl: response.checkout_url };
}

/**
 * Derive the public callback URL from the success-redirect URL the caller built
 * (same origin), if FLITT_CALLBACK_URL is not set explicitly.
 */
function deriveCallbackUrl(successUrl: string): string {
  try {
    const u = new URL(successUrl);
    return `${u.origin}/api/payments/webhook`;
  } catch {
    return '/api/payments/webhook';
  }
}
