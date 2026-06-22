import { flittSignature, verifyFlittSignature, type FlittParams } from './flitt-signature';

/**
 * Poll Flitt order status — fallback when a callback is delayed or an order is
 * stuck in PENDING. Returns the parsed `order_status` (and the raw response).
 *
 * POST https://pay.flitt.com/api/status/order_id  with params under root `request`.
 * The response is the same shape as an accept-purchase response; we verify its
 * signature before trusting it.
 */

const FLITT_STATUS_URL = 'https://pay.flitt.com/api/status/order_id';

export interface FlittStatusResult {
  orderStatus?: string;
  responseStatus?: string;
  verified: boolean;
  raw: Record<string, unknown> | null;
}

export async function fetchFlittStatus(orderId: string): Promise<FlittStatusResult> {
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secret = process.env.FLITT_PAYMENT_KEY;
  if (!merchantId || !secret) {
    throw new Error('FLITT not configured');
  }

  const params: FlittParams = {
    order_id: orderId,
    merchant_id: Number(merchantId),
    version: '1.0.1',
  };
  params.signature = flittSignature(secret, params);

  const res = await fetch(FLITT_STATUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request: params }),
  });

  const data = (await res.json().catch(() => null)) as { response?: Record<string, unknown> } | null;
  const response = data?.response ?? null;
  if (!response) return { verified: false, raw: null };

  const received = typeof response.signature === 'string' ? response.signature : undefined;
  const verified = verifyFlittSignature(secret, response as FlittParams, received);

  return {
    orderStatus: typeof response.order_status === 'string' ? response.order_status : undefined,
    responseStatus: typeof response.response_status === 'string' ? response.response_status : undefined,
    verified,
    raw: response,
  };
}
