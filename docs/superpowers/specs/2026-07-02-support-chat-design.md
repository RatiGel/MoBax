# Customer Support Chat — Design

**Date:** 2026-07-02
**Status:** Approved

## Goal

Let logged-in customers message the store owner/manager directly from the storefront. Staff reply from the admin panel. Support is "online" Monday–Saturday 11:00–20:00 (Asia/Tbilisi); outside those hours customers can still leave messages and staff reply on the next working day.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Who can chat | Logged-in users only |
| Message delivery | Polling (no websocket service) |
| Off-hours behavior | Accept messages, show offline banner |
| Widget UX | One launcher bubble, two tabs: Mobi AI / Support |

## Data Model

New Mongoose models in `models/`:

### `Conversation`
- `userId: ObjectId` (ref User, indexed, one active conversation per user)
- `status: 'open' | 'closed'` (default `open`)
- `lastMessageAt: Date` (indexed, for sorting)
- `unreadByAdmin: number` (default 0)
- `unreadByUser: number` (default 0)
- timestamps

### `SupportMessage` (separate collection)
- `conversationId: ObjectId` (ref Conversation, indexed)
- `senderId: ObjectId` (ref User)
- `senderRole: 'customer' | 'staff'`
- `body: string` (trimmed, max 2000 chars)
- `createdAt: Date`

A customer always reuses their single conversation; sending a message to a `closed` conversation reopens it (`status: 'open'`).

## Working Hours

`lib/support-hours.ts` — single source of truth:

- `isSupportOnline(now?: Date): boolean` — true if weekday is Mon–Sat and local time in `Asia/Tbilisi` is within [11:00, 20:00).
- Computed server-side (returned by API), never from the client clock.
- Hours constants exported so UI can render the schedule text.

## API

### Customer (session required; any authenticated user)
- `GET /api/support` → `{ online: boolean, conversation: {...} | null, messages: [...] }`. Marks staff messages read (`unreadByUser = 0`).
- `POST /api/support` body `{ body: string }` → creates conversation if none, appends message, bumps `lastMessageAt`, increments `unreadByAdmin`, reopens if closed. Returns created message + `online` flag.

### Admin (session role SUPER_ADMIN or STORE_MANAGER)
- `GET /api/admin/support` → conversation list with customer name/email, last message preview, unread counts, sorted by `lastMessageAt` desc.
- `GET /api/admin/support/[id]` → messages for conversation; resets `unreadByAdmin`.
- `POST /api/admin/support/[id]` body `{ body: string }` → append staff reply, increment `unreadByUser`.
- `PATCH /api/admin/support/[id]` body `{ status: 'open' | 'closed' }`.

Validation: reject empty/whitespace body, cap 2000 chars, 400 on invalid. 401/403 per auth rules. Blocked users (`isBlocked`) cannot post.

## Storefront Widget

Refactor `components/shop/ChatAssistant.tsx`:

- Same single launcher bubble, same panel shell.
- Panel header gains two tabs: **Mobi AI** (default; existing AI logic untouched) and **Support**.
- Support tab states:
  - Not logged in → message + link to `/{locale}/login`.
  - Logged in → thread view, input, send.
  - Online indicator: green dot + "Online" when `isSupportOnline`, gray dot + offline banner ("We're offline — leave a message, we reply from 11:00", localized) otherwise. Input always enabled.
- Polling: `GET /api/support` every 4 s while the Support tab is open and document is visible; stops when tab/panel closed.

## Admin Page

New `/admin/messages` (guard: SUPER_ADMIN, STORE_MANAGER — same pattern as other admin pages):

- Two-pane layout: conversation list (customer name/email, last message preview, relative time, unread badge) + thread view with reply box.
- Opening a thread marks it read. Close/reopen button in thread header.
- Sidebar nav item "Messages" with total-unread badge; badge polls `GET /api/admin/support` every 10 s.

## i18n

New `support` namespace in `messages/en.json` and `messages/ka.json`: tab labels, offline banner, login prompt, placeholder, schedule text, admin strings as needed.

## Error Handling

- API returns proper status codes; widget shows localized error line on failed send (same pattern as AI tab).
- Polling failures are silent (retry next tick).

## Testing

No test suite exists in the repo. Verify manually: customer send/receive flow, admin reply flow, unread badges, off-hours banner (mock date), role guards (CUSTOMER blocked from admin API, CONTENT_EDITOR blocked from messages page), login prompt for guests.

## Out of Scope (YAGNI)

Email/push notifications, file attachments, typing indicators, multiple threads per customer, canned replies, chat transcripts export, real-time websockets.
