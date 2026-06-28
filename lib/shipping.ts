/**
 * Single source of truth for shipping rules — shared by the checkout/cart UI
 * and the order API so the total the buyer sees always matches what's charged.
 * Previously these numbers were inlined in app/api/orders/route.ts; the
 * storefront never showed shipping, so buyers were surprised by a +₾5 fee at
 * the gateway. Keep this the only place the rule lives.
 */
export const FREE_SHIPPING_THRESHOLD = 50;
export const SHIPPING_FEE = 5;

/** Shipping cost for a given subtotal: free at/above the threshold, flat fee below. */
export function getShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/** Amount still needed to unlock free shipping (0 once the threshold is met). */
export function amountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
