# User Account / Profile — Design

**Date:** 2026-07-07
**Status:** Approved (pending spec review)

## Goal

Give a signed-in customer a self-service **account area** reached from the navbar
avatar dropdown. Three panels:

- **Profile** — edit name, save a default shipping address, change password.
- **Orders** — list all of the customer's orders; open any for full detail.
- **Messages** — the customer support chat thread (already backed by the
  `/api/support` conversation API).

The saved profile address **prefills checkout** for logged-in buyers.

## Scope decisions (from brainstorming)

- Saved address: **one** default address, used to **prefill checkout** (not
  multiple addresses).
- Editable profile fields: **name** (first/last) + **password change**. Email is
  **read-only** (login identity). No avatar upload.
- Layout: **shared `/account` section with a sidebar**; dropdown items deep-link
  into it.
- Orders: **new list + detail under `/account`**; keep the existing public
  `/orders/[id]` tracking page (guest/email lookup) untouched.

## Architecture

New route group under the existing `(shop)` group, so it inherits the storefront
navbar/footer chrome:

```
app/[locale]/(shop)/account/
  layout.tsx              ← auth guard + AccountSidebar
  page.tsx                ← Profile (name, address, password)
  orders/page.tsx         ← my orders list
  orders/[id]/page.tsx    ← my order detail
  messages/page.tsx       ← support chat
```

- `layout.tsx` — server component. Calls `auth()`; if no session, redirect to
  `/${locale}/login?callbackUrl=/account`. Renders `AccountSidebar` + content
  slot.
- `AccountSidebar` — client component (`components/account/AccountSidebar.tsx`).
  Links: Profile · Orders · Messages · Sign out. Active-link aware
  (`usePathname`), collapses to a horizontal tab row on mobile.

### Navbar dropdown

Update `components/layout/AccountMenu.tsx` logged-in menu items:

- **My profile** → `/account`
- **Orders** → `/account/orders`
- **Messages** → `/account/messages`
- Admin panel (existing, role-gated) → `/admin`
- Sign out (existing)

## Data model changes

Add an optional `address` subdocument to `models/User.ts` — same shape as the
order `addressSnapshot` minus `email` (email lives on the user):

```ts
address?: {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  regionName?: string;
  zipCode?: string;
  country: string; // default 'Georgia'
};
```

Optional field → no migration; existing users simply have `address` undefined.

## API changes

All account routes require a session (`auth()` → 401 if absent) and operate only
on `session.user.id`.

| Route | Method | Behavior |
|---|---|---|
| `/api/account/profile` | `GET` | Return `{ firstName, lastName, email, address, hasPassword }`. `hasPassword = !!user.passwordHash`. Never return `passwordHash`. |
| `/api/account/profile` | `PATCH` | Update `firstName`, `lastName`, `address` (Zod-validated). Ignores any attempt to set email/role/passwordHash. |
| `/api/account/password` | `POST` | Body `{ currentPassword, newPassword }`. If `!user.passwordHash` → 400 (Google account). bcrypt-compare `currentPassword`; on mismatch → 400. Else set `passwordHash = bcrypt(newPassword)`. `newPassword` min length matches register rules. |
| `/api/orders` | `GET` (**new**; currently POST-only) | List orders where `userId === session.user.id`, sorted `createdAt` desc. Return per order: `{ _id, orderNumber, status, paymentStatus, total, createdAt, itemCount, firstImage }` where `itemCount = items.length` and `firstImage = items[0]?.image`. |
| `/api/orders/[id]` | `GET` (reuse) | Already session-owner aware — no change. |
| `/api/support` | `GET` / `POST` (reuse) | Already implemented (thread + send, forwards to Telegram) — no change. |

Validation schemas added to `lib/validations.ts`:
`UpdateProfileSchema`, `ChangePasswordSchema`, `ProfileAddressSchema` (reusing the
address field rules already used at checkout where practical).

## Data flow

**Profile load/save**
```
/account (client) → GET /api/account/profile → populate form
  user edits → PATCH /api/account/profile → 200 → toast "Saved"
```

**Checkout prefill**
```
checkout page mount (logged in) → GET /api/account/profile
  → seed `form` initial state from user.address (blank fallback for guests)
```
Guests and users without a saved address get the current blank form — no
regression.

**Orders**
```
/account/orders → GET /api/orders (mine) → list rows
  row click → /account/orders/[id] → GET /api/orders/[id] → detail
```

**Messages**
```
/account/messages mount → GET /api/support → { online, conversation, messages }
  render bubbles (senderRole: customer | staff)
  send → POST /api/support { body } → append returned message
```

## Components / reuse

- **`OrderSummary`** (`components/shop/OrderSummary.tsx`) — extract the items list
  + totals block currently inline in `app/[locale]/(shop)/orders/[id]/page.tsx`.
  Both the public tracking page and `/account/orders/[id]` render it. The public
  tracking page keeps its email-lookup wrapper + status timeline; the account
  detail page renders the timeline + `OrderSummary` directly (session already
  authorizes, no email form).
- **`AccountSidebar`** — new, described above.
- **`MessagesPanel`** (`components/account/MessagesPanel.tsx`) — client chat UI:
  message bubbles, online/offline badge from `isSupportOnline`, textarea + send,
  optimistic append then reconcile with server response.

## Password change security

- Password form only rendered when `hasPassword === true`. Google-only accounts
  see a note ("You sign in with Google") instead of the form.
- API defense-in-depth: `POST /api/account/password` returns 400 if
  `!user.passwordHash`, independent of the UI.
- Verify `currentPassword` with `bcrypt.compare` before writing the new hash.
- `newPassword` validated (min length ≥ register rule); hash with same bcrypt
  cost factor used at registration.
- `passwordHash` never serialized to any response.

## i18n

New `account` namespace in `messages/en.json` and `messages/ka.json`. Every
user-facing string (sidebar labels, form labels, buttons, empty states, toasts,
error messages) has both EN and KA. Reuse existing checkout address labels where
the same string already exists.

## Error handling

- Unauthenticated access to `/account/**` → redirect to login with `callbackUrl`.
- API 401 on any account fetch (session expired mid-session) → client redirects
  to login.
- Profile PATCH validation error → inline field errors, no navigation.
- Password wrong-current → inline error on the current-password field.
- Orders list empty → friendly empty state with a link to shop.
- Messages send failure → keep the draft, show retry-able error.

## Testing

Manual (no test suite yet):

- **Profile:** edit name + address → save → reload → persists. Log in as a
  different user → sees their own data, not the first user's.
- **Checkout prefill:** with a saved address, open checkout → fields prefilled;
  guest / no-saved-address → blank form (no regression).
- **Password:** wrong current → rejected; correct → changes and can log in with
  the new password; Google account → no form shown, API returns 400 if called.
- **Orders:** list shows only my orders, newest first; opening another user's
  order id → 404; empty account → empty state.
- **Messages:** send a message → appears in thread and in the admin messages
  view; online/offline badge reflects support hours; Telegram forward fires.

## Out of scope (YAGNI)

- Multiple saved addresses.
- Avatar / profile picture upload.
- Email address change.
- Order cancellation / returns from the UI.
- Real-time message push (poll/refetch on open is sufficient for v1).
