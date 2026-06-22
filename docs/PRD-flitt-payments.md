# PRD — Flitt Payments Integration (MoBax)

**Status:** Draft → Implementation
**Owner:** MoBax
**Date:** 2026-06-22
**Gateway:** [Flitt](https://docs.flitt.com) — Georgian hosted-checkout card gateway
**Model:** Single payment (customer pays once for a product order). No subscriptions, no saved cards, no preauth/capture.

---

## 1. Goal

Let customers pay for an order with a card via Flitt's hosted checkout. Replace the stubbed
gateway abstraction (`STRIPE`/`TBC`/`BOG`) and COD with a single payment method: **FLITT**.

The order lifecycle becomes:

```
create order (PENDING/unpaid)  →  redirect to Flitt checkout  →  customer pays
        →  Flitt server callback (authoritative)  →  order PAID/CONFIRMED
        →  customer redirected back to order page
```

## 2. Scope

### In scope
- New `FLITT` payment method in `lib/payments`.
- Flitt signature helper (SHA1, port of `flitt_signature.py` to TS).
- `initiateFlitt()` — server-to-server `POST /api/checkout/url`, return `checkout_url`.
- Server callback handler at `/api/payments/webhook` — verify Flitt signature, set order state, idempotent, returns `200`.
- `success` / `fail` redirect handlers — show result, treat callback as source of truth.
- Order-status polling fallback (`/api/status/order_id`) for stuck `PENDING` orders.
- Env vars for merchant id + payment key.
- Currency = `GEL`. Amount sent in **tetri** (minor units, GEL × 100).

### Out of scope (single-pay model)
- Subscriptions, saved cards / `rectoken`, preauth/capture, reversals UI, direct (PCI) card entry, Open Banking.
- Refunds: not automated here. (Manual via Flitt portal; reversal API a later phase.)
- COD, Stripe, TBC, BOG — **removed** from the enum.

## 3. Flitt API facts (from skill + docs)

| Item | Value |
| --- | --- |
| Create-order endpoint | `POST https://pay.flitt.com/api/checkout/url` |
| Status endpoint | `POST https://pay.flitt.com/api/status/order_id` |
| Request envelope | JSON, params under root `request` object |
| Signature | SHA1 of `secret \| sorted-nonempty-values`, lowercase hex; exclude `signature` + `response_signature_string` |
| Callback method | `POST`, `application/json`, flat JSON body (no `response` wrapper), 30s timeout, no redirects |
| Callback success | merchant must return HTTP `200` or Flitt retries (2s,60s,5m,10m,1h,24h) |
| Callback source IPs | `54.154.216.60`, `3.75.125.89` |
| Amount | integer minor units (tetri). `amount` and `currency` required |
| Currency (Georgia) | `GEL`, `USD`, `EUR` — we use `GEL` |
| Payment result fields | `order_status` (`approved`/`declined`/`processing`/`created`/`expired`/`reversed`), `response_status` (API status, NOT payment result) |

**Critical:** `response_status=success` only means the API call processed. Payment outcome is `order_status`.

## 4. Required request params (create order)

`order_id`, `merchant_id`, `order_desc`, `amount` (tetri), `currency=GEL`, `signature`,
plus `server_callback_url`, `response_url`, `lang`. `order_id` = our Mongo order `_id` string
(already unique, used as the idempotency key).

## 5. Credentials / env

```
FLITT_MERCHANT_ID=1549901          # SANDBOX test merchant (go-live: 4057235)
FLITT_PAYMENT_KEY=test             # SANDBOX secret (go-live: real payment key)
# Credit/payout key — NOT used in single-pay (payouts/reversals only). Store but unused.
FLITT_CREDIT_KEY=
NEXT_PUBLIC_SITE_URL=https://...   # must be public HTTPS for callbacks to reach us
```

> **Security:** live keys go in env / secret manager only — never committed. The live keys
> shared in chat must be rotated in the Flitt dashboard before production use.

**Phase plan:** build + verify against sandbox (`1549901`/`test`), then swap env to `4057235`
+ real payment key for go-live. No code change needed for the swap.

## 6. Order state mapping

| Flitt `order_status` | MoBax `paymentStatus` | MoBax `status` |
| --- | --- | --- |
| `approved` | `PAID` | `PENDING` → `CONFIRMED` |
| `declined` / `expired` | `FAILED` | unchanged |
| `processing` / `created` | `PENDING` (no change) | unchanged |
| `reversed` | `REFUNDED` | unchanged |

Idempotent: a retried callback for an already-`PAID` order is a no-op `200`.

## 7. Acceptance criteria

1. Placing an order with `paymentMethod=FLITT` returns `payment.redirectUrl` = Flitt `checkout_url`.
2. Approve test card → callback fires → order `PAID`/`CONFIRMED`; redirect lands on order page.
3. Decline test card → order `FAILED`; redirect lands on fail page.
4. Callback with bad signature → `401`, order untouched.
5. Duplicate approved callback → `200`, no double state change / double email.
6. Amount on Flitt page equals order total in GEL (tetri math correct).
7. Missing/empty `FLITT_*` env → `initiateFlitt` throws clear "not configured" error; order stays `PENDING`.
8. `npm run build` + `npm run lint` pass.

## 8. Implementation steps

1. **Signature helper** — `lib/payments/flitt-signature.ts`: `flittSignature(secret, params)` + `verifyFlittSignature(secret, params, sig)`. Port of the Python (UTF-8, sort keys, drop empty, exclude excluded keys, lowercase SHA1).
2. **Provider** — rewrite `lib/payments/index.ts`: methods = `['FLITT']`. `initiateFlitt()` POSTs `/api/checkout/url`, reads `checkout_url`, returns `{ redirectUrl }`.
3. **Validation** — `CreateOrderSchema.paymentMethod` enum → `['FLITT']`.
4. **Webhook** — rewrite `/api/payments/webhook` to verify Flitt SHA1 over the flat callback body, map `order_status`, idempotent, `200`.
5. **Success/Fail** — keep redirect handlers; treat them as UX only, callback authoritative.
6. **Status poll** — `lib/payments/flitt-status.ts` helper for the stuck-order fallback (optional cron / on-demand).
7. **Env** — update `.env.local` with `FLITT_*`, drop dead gateway vars.
8. **Verify** — sandbox test cards, then build/lint.

## 9. Risks

- **Callbacks need public HTTPS.** Localhost won't receive Flitt callbacks — use a tunnel (e.g. cloudflared) or deploy to Vercel for end-to-end callback testing. Success-redirect optimistic update covers local dev.
- **Tetri rounding** — always `Math.round(total * 100)`.
- **Signature drift** — empty values must be omitted entirely incl. separator; preserve `0`.
