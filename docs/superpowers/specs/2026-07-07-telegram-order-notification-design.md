# Telegram Order Notification — Design

**Date:** 2026-07-07
**Status:** Approved (pending spec review)

## Goal

When a customer's order is **paid**, send a summary notification to a Telegram
chat via the existing `@Mobi987_bot`, so the team is alerted in real time
without opening the admin panel.

## Trigger

Fires on **payment success** — the moment an order flips to `PAID` /
`PROCESSING` in `app/api/payments/success/route.ts`, inside the existing
`justPaid && order` block. This guarantees:

- Only genuinely-paid orders notify (no abandoned/unpaid noise).
- Exactly **once per order** — reuses the atomic `justPaid` guard
  (`modifiedCount > 0`) that already dedupes the customer confirmation email,
  so a duplicate Flitt return (GET + POST, or a retry) won't double-send.

## Message content

Summary + admin link (HTML `parse_mode`):

```
🛒 New paid order MB-2026-0042

Customer: John Doe
Total: 149.00 ₾
Items: 3

<a href="https://site/admin/orders/<id>">View in admin</a>
```

- Order number, customer name (from `addressSnapshot.firstName` + `lastName`),
  total, item count.
- Link to `/admin/orders/<id>` built from the same `origin` the success route
  already resolves (`NEXT_PUBLIC_SITE_URL` || request origin).

## Credentials

Environment variables in `.env.local`:

- `TELEGRAM_BOT_TOKEN` — bot token from @BotFather.
- `TELEGRAM_CHAT_ID` — numeric destination chat id (`1808500232`, personal chat).

If **either** is unset, the sender is a silent no-op (mirrors the existing
`resolveAdminEmail()` → skip pattern). No hard dependency; the order flow never
breaks if Telegram is unconfigured.

## Architecture

New self-contained module `lib/telegram.ts`, mirroring `lib/email/send.ts`:

- `sendTelegramOrderNotification(input): Promise<void>`
  - `input`: `{ orderNumber, customerName, total, itemCount, adminUrl }`
  - Reads token + chat id from env; returns early if unset.
  - Builds the HTML message, POSTs to
    `https://api.telegram.org/bot<token>/sendMessage` with
    `{ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }`.
  - Wrapped in try/catch; logs a warning on failure and **never throws**.

Wiring: `payments/success/route.ts` calls it fire-and-forget (`void ...`) next
to the customer confirmation email, inside `justPaid && order`.

## Data flow

```
Flitt success return
  → success route: atomic flip to PAID (justPaid guard)
    → [existing] customer confirmation email (void)
    → [new] sendTelegramOrderNotification(...) (void)
  → 303 redirect to confirmation page
```

## Error handling

- Missing env → silent no-op.
- Telegram API non-200 / network error → caught, `console.warn`, swallowed.
- Never blocks or fails the payment-success redirect.

## Testing

- Manual: place + pay a test order → confirm message arrives in chat
  `1808500232`.
- Env-unset path: temporarily unset a var → confirm order still completes and no
  throw (log line present).
- Dedup: simulate double Flitt return → confirm single Telegram message.

## Out of scope (YAGNI)

- Admin-panel-editable credentials (env only for now).
- Notifications on order placement or status changes (paid-only).
- Localized message text (English only — internal team channel).

## Security note

The bot token was shared in chat and is exposed. **Revoke via @BotFather and
issue a fresh token before production**, then store only in `.env.local`
(never committed).
