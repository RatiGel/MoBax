# Telegram Support Message Forwarding — Design

**Date:** 2026-07-07
**Status:** Approved (pending spec review)

## Goal

When a customer sends a message to customer support, forward the full message
to the team's Telegram chat via the existing `@Mobi987_bot`, including a
deep-link to the admin panel so a staff member can open the conversation and
reply — without polling the admin inbox.

## Trigger

Fires when a **customer** posts a support message — in
`app/api/support/route.ts`, `POST` handler, immediately after the
`SupportMessage` and `Conversation` writes succeed.

- Only customer messages notify (`senderRole: 'customer'`). Staff replies,
  posted through the admin route, never re-forward.
- One alert per customer message. No dedup guard — each message is a distinct
  event and intentionally produces one notification.
- Fired fire-and-forget (`void`) after the `201` payload is built, so a
  Telegram failure can never block or fail the customer's send.

## Message content

Full message body + customer name + admin deep-link (HTML `parse_mode`):

```
💬 New support message from John Doe

Hi, my phone case arrived cracked — can I get a replacement?

<a href="https://site/admin/messages?c=<conversationId>">Open in admin</a>
```

- Customer name from the `User` record already loaded in the handler (extend
  the `.select(...)` to include `firstName lastName email`). Falls back to
  email, then `"Customer"`.
- Full body (already capped at 2000 chars by the route's validation), escaped
  for Telegram HTML.
- Link to `/admin/messages?c=<conversationId>`. `origin` resolved the same way
  the payments success route does: `NEXT_PUBLIC_SITE_URL || req.nextUrl.origin`.

## Credentials

Reuses the existing paid-order notification config — no new env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

If either is unset, the sender is a silent no-op (same contract as
`sendTelegramOrderNotification`). Support and order alerts share one chat.

## Architecture

Add a second exported function to the existing `lib/telegram.ts`, reusing its
`escapeHtml` helper and the token/chat-id/no-op/never-throw contract:

- `sendTelegramSupportMessage(input): Promise<void>`
  - `input`: `{ customerName, body, adminUrl }`
  - Reads token + chat id from env; returns early if unset.
  - Builds the HTML message, POSTs to
    `https://api.telegram.org/bot<token>/sendMessage` with
    `{ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }`.
  - Wrapped in try/catch; logs a warning on failure and **never throws**.

**Admin deep-link:** `app/admin/messages/MessagesClient.tsx` reads a `c` query
param (via `useSearchParams`) on mount and, if present, seeds `selectedId` so
the thread opens automatically. No param → current behavior (empty selection).

**Wiring:** `app/api/support/route.ts` `POST` resolves `origin`, builds
`adminUrl`, and calls `void sendTelegramSupportMessage(...)` after the DB writes.

## Data flow

```
Customer POST /api/support
  → validate + block check
  → upsert Conversation (unreadByAdmin++)
  → create SupportMessage (senderRole: 'customer')
  → [new] void sendTelegramSupportMessage({ customerName, body, adminUrl })
  → 201 with serialized message
```

## Error handling

- Missing env → silent no-op.
- Telegram API non-200 / network error → caught, `console.warn`, swallowed.
- Never blocks or fails the customer's message send.

## Testing

- Manual: signed-in customer sends a support message → confirm a Telegram
  message arrives with the full body and a working `?c=<id>` link.
- Deep-link: click the link → admin `/admin/messages` opens with that
  conversation already selected.
- Env-unset path: temporarily unset a var → confirm the message still sends and
  no throw (log line present).
- Staff reply: post a reply from admin → confirm **no** Telegram forward.

## Out of scope (YAGNI)

- Replying to customers from Telegram (admin replies in the panel only).
- Separate support vs. order chats (single `TELEGRAM_CHAT_ID`).
- Localized message text (English only — internal team channel).
- Batching / rate-limiting rapid customer messages.

## Security note

The bot token was shared in chat and is exposed. **Revoke via @BotFather and
issue a fresh token before production**, then store only in `.env.local`
(never committed). Same token/chat as the order-notification feature.
