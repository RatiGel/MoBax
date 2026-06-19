/**
 * Payment provider abstraction.
 *
 * MoBax supports four methods (plan Phase 6):
 *   - COD       Cash on delivery (Tbilisi only) — no gateway, order goes straight to PENDING/unpaid.
 *   - STRIPE    Cards (international) — PaymentIntent / redirect.
 *   - TBC       TBC Pay (Georgian bank) — hosted redirect + webhook.
 *   - BOG       BOG Pay (Georgian bank) — hosted redirect + webhook.
 *
 * Bank + Stripe integrations are STUBBED: they return a redirect/clientSecret only
 * when the corresponding credentials are present in env, otherwise they throw a
 * clear "not configured" error. COD is fully functional with no external deps.
 *
 * To go live, fill the env vars (see .env.local) and replace the `initiate*`
 * stub bodies with real SDK/API calls. The webhook routes already verify a shared
 * secret and update order.paymentStatus — wire the provider's signature check there.
 */

export const PAYMENT_METHODS = ['COD', 'STRIPE', 'TBC', 'BOG'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === 'string' && (PAYMENT_METHODS as readonly string[]).includes(v);
}

export interface InitiateResult {
  /** For redirect-based gateways (TBC/BOG/Stripe Checkout): URL to send the buyer to. */
  redirectUrl?: string;
  /** For Stripe Elements: the PaymentIntent client secret. */
  clientSecret?: string;
  /** True when no gateway step is needed (COD). */
  immediate?: boolean;
}

export class PaymentNotConfiguredError extends Error {
  constructor(method: PaymentMethod) {
    super(`Payment method ${method} is not configured. Add its credentials to env.`);
    this.name = 'PaymentNotConfiguredError';
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

export async function initiatePayment(args: InitiateArgs): Promise<InitiateResult> {
  switch (args.method) {
    case 'COD':
      // No gateway. Order is created unpaid; cash collected on delivery.
      return { immediate: true };
    case 'STRIPE':
      return initiateStripe(args);
    case 'TBC':
      return initiateTbc(args);
    case 'BOG':
      return initiateBog(args);
    default:
      throw new Error(`Unknown payment method: ${args.method}`);
  }
}

async function initiateStripe(_args: InitiateArgs): Promise<InitiateResult> {
  if (!process.env.STRIPE_SECRET_KEY) throw new PaymentNotConfiguredError('STRIPE');
  // TODO: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  //   const intent = await stripe.paymentIntents.create({ amount: Math.round(_args.amount*100), currency:'gel', metadata:{orderId:_args.orderId} })
  //   return { clientSecret: intent.client_secret! }
  throw new PaymentNotConfiguredError('STRIPE');
}

async function initiateTbc(_args: InitiateArgs): Promise<InitiateResult> {
  if (!process.env.TBC_MERCHANT_ID || !process.env.TBC_SECRET) {
    throw new PaymentNotConfiguredError('TBC');
  }
  // TODO: call TBC E-Commerce API to create a payment, return its hosted-page redirect URL.
  throw new PaymentNotConfiguredError('TBC');
}

async function initiateBog(_args: InitiateArgs): Promise<InitiateResult> {
  if (!process.env.BOG_CLIENT_ID || !process.env.BOG_CLIENT_SECRET) {
    throw new PaymentNotConfiguredError('BOG');
  }
  // TODO: OAuth token → create order on BOG → return redirect URL.
  throw new PaymentNotConfiguredError('BOG');
}
