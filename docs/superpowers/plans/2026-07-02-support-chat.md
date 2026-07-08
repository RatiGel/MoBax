# Customer Support Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logged-in customers message store staff from the storefront chat widget (new "Support" tab next to the existing AI tab); staff reply from a new `/admin/messages` page. Online hours Mon–Sat 11:00–20:00 Asia/Tbilisi; off-hours messages still accepted.

**Architecture:** Two new Mongoose models (`Conversation`, `SupportMessage`). Customer API at `/api/support` (session-guarded), admin API at `/api/admin/support[/​[id]]` (role-guarded via existing `requireAdmin` + new `support` module in rbac). Client polls — no websockets. Widget: existing `ChatAssistant.tsx` gains a tab bar; new `SupportChat.tsx` renders the support thread. Admin: two-pane messages page following existing `page.tsx` + `*Client.tsx` pattern.

**Tech Stack:** Next.js 14 App Router, TypeScript, Mongoose 9, NextAuth v5 (`auth()` from `@/auth`), next-intl, Tailwind, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-07-02-support-chat-design.md`

## Global Constraints

- Working directory: `/Users/rati/Desktop/MoBax/MoBax` (repo root; all paths below relative to it).
- Every storefront user-facing string must exist in BOTH `messages/en.json` and `messages/ka.json` (admin panel is English-only — follows existing admin pages).
- Working hours: Mon–Sat, 11:00–20:00 (open inclusive, close exclusive), timezone `Asia/Tbilisi`, computed server-side only.
- Message body: trimmed, non-empty, max 2000 chars.
- Admin API uses the `ok`/`fail` envelope from `lib/api.ts`; customer API uses plain `NextResponse.json` with `{ error }` on failure (matches `app/api/reviews/route.ts`).
- Support module roles: `SUPER_ADMIN`, `STORE_MANAGER` only.
- No test framework in repo — pure logic is verified with `npx tsx` scripts; routes/UI verified via build + manual checklist (Task 9).
- Commit after every task. No `git push`.

---

### Task 1: Working-hours helper

**Files:**
- Create: `lib/support-hours.ts`
- Test (throwaway script): `/private/tmp/claude-501/-Users-rati-Desktop-MoBax/c41de787-18da-451c-9a41-422c8e4a02b1/scratchpad/test-support-hours.ts`

**Interfaces:**
- Produces: `isSupportOnline(now?: Date): boolean`, constants `SUPPORT_TIMEZONE`, `SUPPORT_OPEN_HOUR = 11`, `SUPPORT_CLOSE_HOUR = 20`. Consumed by Tasks 4, 5.

- [ ] **Step 1: Write the failing test script** (scratchpad, not committed)

```ts
// /private/tmp/claude-501/-Users-rati-Desktop-MoBax/c41de787-18da-451c-9a41-422c8e4a02b1/scratchpad/test-support-hours.ts
import { isSupportOnline } from '/Users/rati/Desktop/MoBax/MoBax/lib/support-hours';

// Tbilisi is UTC+4 year-round (no DST). Construct UTC instants and assert.
const cases: Array<[string, boolean, string]> = [
  // Monday 2026-07-06. 11:00 Tbilisi = 07:00 UTC.
  ['2026-07-06T07:00:00Z', true,  'Mon 11:00 Tbilisi — opens'],
  ['2026-07-06T06:59:00Z', false, 'Mon 10:59 Tbilisi — before open'],
  ['2026-07-06T15:59:00Z', true,  'Mon 19:59 Tbilisi — last minute'],
  ['2026-07-06T16:00:00Z', false, 'Mon 20:00 Tbilisi — closed (exclusive)'],
  // Sunday 2026-07-05, midday.
  ['2026-07-05T09:00:00Z', false, 'Sun 13:00 Tbilisi — closed all day'],
  // Saturday 2026-07-04, midday.
  ['2026-07-04T09:00:00Z', true,  'Sat 13:00 Tbilisi — open'],
  // Midnight edge: Tue 00:30 Tbilisi = Mon 20:30 UTC.
  ['2026-07-06T20:30:00Z', false, 'Tue 00:30 Tbilisi — night'],
];

let failed = 0;
for (const [iso, expected, label] of cases) {
  const got = isSupportOnline(new Date(iso));
  if (got !== expected) { failed++; console.error(`FAIL: ${label} (got ${got})`); }
  else console.log(`PASS: ${label}`);
}
if (failed) process.exit(1);
console.log('All support-hours cases pass.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx /private/tmp/claude-501/-Users-rati-Desktop-MoBax/c41de787-18da-451c-9a41-422c8e4a02b1/scratchpad/test-support-hours.ts`
Expected: FAIL — `Cannot find module '.../lib/support-hours'`

- [ ] **Step 3: Write implementation**

```ts
// lib/support-hours.ts
export const SUPPORT_TIMEZONE = 'Asia/Tbilisi';
export const SUPPORT_OPEN_HOUR = 11;
export const SUPPORT_CLOSE_HOUR = 20; // exclusive

/**
 * True when store support staff are considered online:
 * Monday–Saturday, [11:00, 20:00) in Asia/Tbilisi. Always compute on the
 * server — never trust the client clock.
 */
export function isSupportOnline(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);

  if (weekday === 'Sun' || Number.isNaN(hour)) return false;
  return hour >= SUPPORT_OPEN_HOUR && hour < SUPPORT_CLOSE_HOUR;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx /private/tmp/claude-501/-Users-rati-Desktop-MoBax/c41de787-18da-451c-9a41-422c8e4a02b1/scratchpad/test-support-hours.ts`
Expected: 7× PASS, `All support-hours cases pass.`

- [ ] **Step 5: Commit**

```bash
git add lib/support-hours.ts
git commit -m "feat: add support working-hours helper (Mon-Sat 11-20 Tbilisi)"
```

---

### Task 2: Conversation + SupportMessage models

**Files:**
- Create: `models/Conversation.ts`
- Create: `models/SupportMessage.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: default exports `Conversation` (`IConversation`: `userId: Types.ObjectId`, `status: 'open'|'closed'`, `lastMessageAt: Date`, `lastMessageBody: string`, `unreadByAdmin: number`, `unreadByUser: number`, timestamps) and `SupportMessage` (`ISupportMessage`: `conversationId`, `senderId`, `senderRole: 'customer'|'staff'`, `body`, `createdAt`). Consumed by Tasks 4, 5.

- [ ] **Step 1: Write `models/Conversation.ts`**

```ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ConversationStatus = 'open' | 'closed';

export interface IConversation extends Document {
  userId: Types.ObjectId;
  status: ConversationStatus;
  lastMessageAt: Date;
  /** Short preview of the newest message for the admin list (first 120 chars). */
  lastMessageBody: string;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    // One support thread per customer — reopened rather than duplicated.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageBody: { type: String, default: '' },
    unreadByAdmin: { type: Number, default: 0 },
    unreadByUser: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Admin inbox sorts by recency.
ConversationSchema.index({ lastMessageAt: -1 });

const Conversation: Model<IConversation> =
  (mongoose.models.Conversation as Model<IConversation>) ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
```

- [ ] **Step 2: Write `models/SupportMessage.ts`**

```ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SupportSenderRole = 'customer' | 'staff';

export interface ISupportMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: SupportSenderRole;
  body: string;
  createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['customer', 'staff'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Thread reads fetch a conversation's messages in chronological order.
SupportMessageSchema.index({ conversationId: 1, createdAt: 1 });

const SupportMessage: Model<ISupportMessage> =
  (mongoose.models.SupportMessage as Model<ISupportMessage>) ||
  mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);

export default SupportMessage;
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0 (same warnings baseline as before, no new errors).

- [ ] **Step 4: Commit**

```bash
git add models/Conversation.ts models/SupportMessage.ts
git commit -m "feat: add Conversation and SupportMessage models"
```

---

### Task 3: Add `support` admin module to rbac

**Files:**
- Modify: `lib/rbac.ts:4-27`

**Interfaces:**
- Produces: `'support'` as a valid `AdminModule`, granted to `SUPER_ADMIN` and `STORE_MANAGER`. Consumed by Tasks 5, 8 (`requireAdmin({ module: 'support' })`, nav filtering).

- [ ] **Step 1: Edit `lib/rbac.ts`**

Add `| 'support'` to the `AdminModule` union (after `'team'`):

```ts
export type AdminModule =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'pricing'
  | 'theme'
  | 'content'
  | 'settings'
  | 'team'
  | 'support';
```

Add `'support'` to both admin role arrays in `ROLE_MODULES`:

```ts
  SUPER_ADMIN: [
    'analytics', 'products', 'categories', 'orders', 'customers',
    'pricing', 'theme', 'content', 'settings', 'team', 'support',
  ],
  STORE_MANAGER: [
    'analytics', 'products', 'categories', 'orders', 'customers', 'pricing', 'support',
  ],
```

(`CONTENT_EDITOR` and `CUSTOMER` unchanged.)

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add lib/rbac.ts
git commit -m "feat: add support module to admin rbac"
```

---

### Task 4: Customer support API (`/api/support`)

**Files:**
- Create: `app/api/support/route.ts`

**Interfaces:**
- Consumes: `isSupportOnline` (Task 1), `Conversation`, `SupportMessage` (Task 2), `auth` from `@/auth`, `connectDB` from `@/lib/mongodb`, `User` model.
- Produces:
  - `GET /api/support` → 200 `{ online: boolean, conversation: { id: string, status: string } | null, messages: Array<{ id: string, senderRole: 'customer'|'staff', body: string, createdAt: string }> }`; 401 `{ error }`. Side effect: resets `unreadByUser`.
  - `POST /api/support` body `{ body: string }` → 201 `{ online: boolean, message: { id, senderRole, body, createdAt } }`; 401/403/422 `{ error }`.
  - Consumed by Task 7 (`SupportChat`).

- [ ] **Step 1: Write `app/api/support/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import { isSupportOnline } from '@/lib/support-hours';
import Conversation from '@/models/Conversation';
import SupportMessage from '@/models/SupportMessage';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

function serializeMessage(m: {
  _id: unknown;
  senderRole: string;
  body: string;
  createdAt: Date;
}) {
  return {
    id: String(m._id),
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    await connectDB();
    const conversation = await Conversation.findOne({ userId: session.user.id });
    if (!conversation) {
      return NextResponse.json({ online: isSupportOnline(), conversation: null, messages: [] });
    }

    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort('createdAt')
      .lean();

    // Opening the thread reads staff replies.
    if (conversation.unreadByUser > 0) {
      conversation.unreadByUser = 0;
      await conversation.save();
    }

    return NextResponse.json({
      online: isSupportOnline(),
      conversation: { id: String(conversation._id), status: conversation.status },
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    console.error('[support GET]', err);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const body = typeof json?.body === 'string' ? json.body.trim() : '';
    if (!body) {
      return NextResponse.json({ error: 'Message is required' }, { status: 422 });
    }
    if (body.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 422 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select('isBlocked').lean();
    if (!user || user.isBlocked) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 });
    }

    // One thread per customer: create on first message, reopen if closed.
    const conversation = await Conversation.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          status: 'open',
          lastMessageAt: new Date(),
          lastMessageBody: body.slice(0, 120),
        },
        $inc: { unreadByAdmin: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: 'customer',
      body,
    });

    return NextResponse.json(
      { online: isSupportOnline(), message: serializeMessage(message) },
      { status: 201 }
    );
  } catch (err) {
    console.error('[support POST]', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Smoke test unauthenticated 401**

Run (dev server must be running — `npm run dev` in background):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/support
```
Expected: `401`

- [ ] **Step 4: Commit**

```bash
git add app/api/support/route.ts
git commit -m "feat: add customer support chat API"
```

---

### Task 5: Admin support API (`/api/admin/support`, `/api/admin/support/[id]`)

**Files:**
- Create: `app/api/admin/support/route.ts`
- Create: `app/api/admin/support/[id]/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`/`AdminAuthError` (`lib/admin-auth.ts`), `ok`/`fail` (`lib/api.ts`), models from Task 2, `isSupportOnline` (Task 1), `'support'` module (Task 3).
- Produces (all wrapped in the `{ success, data, error }` envelope):
  - `GET /api/admin/support` → `data: { conversations: Array<{ id, status, lastMessageAt, lastMessageBody, unreadByAdmin, customer: { id, name, email } }>, totalUnread: number }`
  - `GET /api/admin/support/[id]` → `data: { conversation: { id, status }, customer: { id, name, email }, messages: [...] }` (same message shape as Task 4). Side effect: resets `unreadByAdmin`.
  - `POST /api/admin/support/[id]` body `{ body: string }` → `data: { message }`, 201.
  - `PATCH /api/admin/support/[id]` body `{ status: 'open'|'closed' }` → `data: { conversation: { id, status } }`.
  - Consumed by Task 8 (admin UI + badge).

- [ ] **Step 1: Write `app/api/admin/support/route.ts`**

```ts
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import Conversation from '@/models/Conversation';
import '@/models/User'; // register User schema for populate

export const dynamic = 'force-dynamic';

interface PopulatedCustomer {
  _id: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function GET() {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const conversations = await Conversation.find({})
      .sort('-lastMessageAt')
      .populate<{ userId: PopulatedCustomer | null }>('userId', 'firstName lastName email')
      .lean();

    let totalUnread = 0;
    const items = conversations.map((c) => {
      totalUnread += c.unreadByAdmin;
      const u = c.userId;
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Deleted user';
      return {
        id: String(c._id),
        status: c.status,
        lastMessageAt: c.lastMessageAt,
        lastMessageBody: c.lastMessageBody,
        unreadByAdmin: c.unreadByAdmin,
        customer: { id: u ? String(u._id) : '', name, email: u?.email ?? '' },
      };
    });

    return ok({ conversations: items, totalUnread });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support GET]', err);
    return fail('Failed to load conversations', 500);
  }
}
```

- [ ] **Step 2: Write `app/api/admin/support/[id]/route.ts`**

```ts
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import Conversation from '@/models/Conversation';
import SupportMessage from '@/models/SupportMessage';
import '@/models/User';

export const dynamic = 'force-dynamic';

interface PopulatedCustomer {
  _id: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function serializeMessage(m: { _id: unknown; senderRole: string; body: string; createdAt: Date }) {
  return { id: String(m._id), senderRole: m.senderRole, body: m.body, createdAt: m.createdAt };
}

async function findConversation(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Conversation.findById(id).populate<{ userId: PopulatedCustomer | null }>(
    'userId',
    'firstName lastName email'
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    const messages = await SupportMessage.find({ conversationId: conversation._id })
      .sort('createdAt')
      .lean();

    if (conversation.unreadByAdmin > 0) {
      conversation.unreadByAdmin = 0;
      await conversation.save();
    }

    const u = conversation.userId;
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Deleted user';

    return ok({
      conversation: { id: String(conversation._id), status: conversation.status },
      customer: { id: u ? String(u._id) : '', name, email: u?.email ?? '' },
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] GET]', err);
    return fail('Failed to load conversation', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin({ module: 'support' });
    await connectDB();

    const json = await req.json().catch(() => null);
    const body = typeof json?.body === 'string' ? json.body.trim() : '';
    if (!body) return fail('Message is required', 422);
    if (body.length > 2000) return fail('Message is too long (max 2000 characters)', 422);

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: 'staff',
      body,
    });

    conversation.status = 'open';
    conversation.lastMessageAt = new Date();
    conversation.lastMessageBody = body.slice(0, 120);
    conversation.unreadByUser += 1;
    await conversation.save();

    return ok({ message: serializeMessage(message) }, 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] POST]', err);
    return fail('Failed to send reply', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin({ module: 'support' });
    await connectDB();

    const json = await req.json().catch(() => null);
    const status = json?.status;
    if (status !== 'open' && status !== 'closed') return fail('Invalid status', 422);

    const conversation = await findConversation(params.id);
    if (!conversation) return notFound('Conversation not found');

    conversation.status = status;
    await conversation.save();

    return ok({ conversation: { id: String(conversation._id), status: conversation.status } });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/support/[id] PATCH]', err);
    return fail('Failed to update conversation', 500);
  }
}
```

- [ ] **Step 3: Verify compile + 401 smoke**

Run: `npx tsc --noEmit`
Expected: exits 0.

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/support`
Expected: `401`

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/support
git commit -m "feat: add admin support conversations API"
```

---

### Task 6: i18n strings (`support` namespace)

**Files:**
- Modify: `messages/en.json` (add top-level `support` key)
- Modify: `messages/ka.json` (same keys, Georgian)

**Interfaces:**
- Produces: `support.*` translation keys, consumed by Task 7 via `useTranslations('support')`.

- [ ] **Step 1: Add to `messages/en.json`** (new top-level namespace after `"reviews"`):

```json
"support": {
  "tabAi": "Mobi AI",
  "tabSupport": "Support",
  "title": "Store support",
  "subtitle": "Talk to a real person",
  "online": "Online",
  "offline": "Offline",
  "hours": "Mon–Sat, 11:00–20:00",
  "offlineBanner": "We're offline right now. Leave a message — we reply Mon–Sat, 11:00–20:00.",
  "greeting": "Questions about an order or a product? Write to us — our team will reply.",
  "loginPrompt": "Sign in to chat with our team.",
  "loginCta": "Sign in",
  "placeholder": "Write to the store…",
  "send": "Send",
  "error": "Couldn't send. Try again."
}
```

- [ ] **Step 2: Add to `messages/ka.json`** (same position):

```json
"support": {
  "tabAi": "Mobi AI",
  "tabSupport": "მხარდაჭერა",
  "title": "მაღაზიის მხარდაჭერა",
  "subtitle": "მიწერეთ ჩვენს გუნდს",
  "online": "ონლაინ",
  "offline": "ოფლაინ",
  "hours": "ორშ–შაბ, 11:00–20:00",
  "offlineBanner": "ამჟამად ოფლაინ ვართ. დაგვიტოვეთ შეტყობინება — გიპასუხებთ ორშ–შაბ, 11:00–20:00.",
  "greeting": "გაქვთ კითხვა შეკვეთაზე ან პროდუქტზე? მოგვწერეთ — ჩვენი გუნდი გიპასუხებთ.",
  "loginPrompt": "მხარდაჭერასთან სასაუბროდ გაიარეთ ავტორიზაცია.",
  "loginCta": "შესვლა",
  "placeholder": "მიწერეთ მაღაზიას…",
  "send": "გაგზავნა",
  "error": "ვერ გაიგზავნა. სცადეთ თავიდან."
}
```

- [ ] **Step 3: Validate JSON**

Run: `python3 -c "import json; json.load(open('messages/en.json')); json.load(open('messages/ka.json')); print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ka.json
git commit -m "feat: add support chat translations (en/ka)"
```

---

### Task 7: Storefront widget — tabs + SupportChat

**Files:**
- Create: `components/shop/SupportChat.tsx`
- Modify: `components/shop/ChatAssistant.tsx` (header region, lines ~93–104: replace single header with tab bar; body: render AI content or `<SupportChat>` by tab)

**Interfaces:**
- Consumes: `GET/POST /api/support` (Task 4), `support.*` i18n keys (Task 6), `useSession` (SessionProvider already wraps the locale layout — `app/[locale]/layout.tsx:47`).
- Produces: `SupportChat({ active }: { active: boolean })` client component; `ChatAssistant` with `tab: 'ai' | 'support'` state.

- [ ] **Step 1: Write `components/shop/SupportChat.tsx`**

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { Send, Loader2, LogIn } from 'lucide-react';

interface SupportMsg {
  id: string;
  senderRole: 'customer' | 'staff';
  body: string;
  createdAt: string;
}

const POLL_MS = 4000;

export function SupportChat({ active }: { active: boolean }) {
  const { status } = useSession();
  const t = useTranslations('support');
  const locale = useLocale();

  const [online, setOnline] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/support');
      if (!res.ok) return; // silent — retry next tick
      const data = await res.json();
      setOnline(data.online);
      setMessages(data.messages);
    } catch {
      /* silent — retry next tick */
    }
  }, []);

  // Poll while the Support tab is open and the page is visible.
  useEffect(() => {
    if (!active || status !== 'authenticated') return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [active, status, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, active]);

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setOnline(data.online);
      setMessages((m) => [...m, data.message]);
      setInput('');
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  if (status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-graphite" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-ink dark:text-neutral-100">{t('loginPrompt')}</p>
        <Link
          href={`/${locale}/login`}
          className="flex items-center gap-2 rounded-full bg-ink dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-ink hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
        >
          <LogIn className="h-4 w-4" />
          {t('loginCta')}
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Status + offline banner */}
      <div className="border-b border-border-light dark:border-border-dark px-5 py-2 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-400'}`}
          aria-hidden
        />
        <span className="text-xs text-graphite">
          {online === null ? t('hours') : online ? t('online') : t('offline')} · {t('hours')}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {online === false && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {t('offlineBanner')}
          </div>
        )}

        {messages.length === 0 && (
          <div className="rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-3 text-sm text-ink dark:text-neutral-100">
            {t('greeting')}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.senderRole === 'customer' ? 'flex justify-end' : ''}>
            <div
              className={
                m.senderRole === 'customer'
                  ? 'max-w-[80%] rounded-2xl rounded-br-md bg-ink dark:bg-white px-4 py-2.5 text-sm text-white dark:text-ink whitespace-pre-wrap'
                  : 'max-w-[80%] rounded-2xl bg-cloud-light dark:bg-cloud-dark px-4 py-2.5 text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap w-fit'
              }
            >
              {m.body}
            </div>
          </div>
        ))}

        {failed && <p className="text-xs text-red-500">{t('error')}</p>}
      </div>

      {/* Input — always enabled; off-hours messages are answered next working day. */}
      <div className="border-t border-border-light dark:border-border-dark p-3">
        <div className="flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark bg-paper dark:bg-ink px-2 py-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent px-3 text-sm text-ink dark:text-white placeholder:text-graphite focus:outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            aria-label={t('send')}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink dark:bg-white text-white dark:text-ink disabled:opacity-40 hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Modify `components/shop/ChatAssistant.tsx`**

2a. Add imports (top of file):

```tsx
import { useTranslations } from 'next-intl';
import { Headset } from 'lucide-react';
import { SupportChat } from './SupportChat';
```

2b. Inside `ChatAssistant()`, add state + translations after `const [open, setOpen] = useState(false);`:

```tsx
const [tab, setTab] = useState<'ai' | 'support'>('ai');
const ts = useTranslations('support');
```

2c. Replace the panel header block (currently lines 94–103, the `{/* Header */}` div) with a tab bar:

```tsx
{/* Tabs */}
<div className="flex border-b border-border-light dark:border-border-dark">
  {(
    [
      { key: 'ai', label: ts('tabAi'), icon: Sparkles },
      { key: 'support', label: ts('tabSupport'), icon: Headset },
    ] as const
  ).map(({ key, label, icon: Icon }) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      aria-selected={tab === key}
      role="tab"
      className={`flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === key
          ? 'border-cobalt text-ink dark:text-white'
          : 'border-transparent text-graphite hover:text-ink dark:hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  ))}
</div>
```

2d. Wrap the existing AI content — the `{/* Messages */}` scroll div AND the `{/* Input */}` div — so they render only on the AI tab, and add the support tab:

```tsx
{tab === 'ai' ? (
  <>
    {/* existing Messages div — unchanged */}
    {/* existing Input div — unchanged */}
  </>
) : (
  <SupportChat active={open && tab === 'support'} />
)}
```

(Do not change any code inside the AI messages/input blocks.)

- [ ] **Step 3: Verify compile + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Manual check in browser**

With `npm run dev` running, open `http://localhost:3000/en`:
- Bubble opens panel with two tabs; AI tab works as before.
- Support tab logged-out → sign-in prompt with working link.
- Sign in as a customer → greeting bubble, status line, send a message → appears right-aligned; off-hours banner shows if outside 11:00–20:00 Tbilisi.

- [ ] **Step 5: Commit**

```bash
git add components/shop/SupportChat.tsx components/shop/ChatAssistant.tsx
git commit -m "feat: add support tab to storefront chat widget"
```

---

### Task 8: Admin messages page + nav badge

**Files:**
- Create: `app/admin/messages/page.tsx`
- Create: `app/admin/messages/MessagesClient.tsx`
- Create: `components/admin/UnreadMessagesBadge.tsx`
- Modify: `components/admin/nav-config.ts:30-47` (add nav item)
- Modify: `components/admin/Sidebar.tsx:73-74` (render badge next to label)

**Interfaces:**
- Consumes: admin API (Task 5), `apiFetch` (`lib/admin-fetch.ts`), `PageHeader`, `EmptyState` (`components/admin/`), `'support'` module (Task 3).
- Produces: `/admin/messages` route; `UnreadMessagesBadge` (no props).

- [ ] **Step 1: Write `app/admin/messages/page.tsx`**

```tsx
import { MessagesClient } from './MessagesClient';

export default function AdminMessagesPage() {
  return <MessagesClient />;
}
```

- [ ] **Step 2: Write `app/admin/messages/MessagesClient.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, Archive, ArchiveRestore } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/admin-fetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConversationRow {
  id: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  lastMessageBody: string;
  unreadByAdmin: number;
  customer: { id: string; name: string; email: string };
}

interface ThreadMessage {
  id: string;
  senderRole: 'customer' | 'staff';
  body: string;
  createdAt: string;
}

interface ThreadData {
  conversation: { id: string; status: 'open' | 'closed' };
  customer: { id: string; name: string; email: string };
  messages: ThreadMessage[];
}

const POLL_MS = 5000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MessagesClient() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const data = await apiFetch<{ conversations: ConversationRow[]; totalUnread: number }>(
        '/api/admin/support'
      );
      setConversations(data.conversations);
    } catch {
      /* silent on poll */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const data = await apiFetch<ThreadData>(`/api/admin/support/${id}`);
      setThread(data);
      // Opening resets unread server-side; mirror locally.
      setConversations((list) =>
        list.map((c) => (c.id === id ? { ...c, unreadByAdmin: 0 } : c))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load conversation');
    }
  }, []);

  // Poll list + open thread.
  useEffect(() => {
    loadList();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadList();
      if (selectedId) loadThread(selectedId);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadList, loadThread, selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread?.messages.length]);

  const open = (id: string) => {
    setSelectedId(id);
    setThread(null);
    loadThread(id);
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const data = await apiFetch<{ message: ThreadMessage }>(
        `/api/admin/support/${selectedId}`,
        { method: 'POST', body: JSON.stringify({ body }) }
      );
      setThread((t) =>
        t ? { ...t, messages: [...t.messages, data.message] } : t
      );
      setReply('');
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!thread || !selectedId) return;
    const next = thread.conversation.status === 'open' ? 'closed' : 'open';
    try {
      await apiFetch(`/api/admin/support/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setThread((t) => (t ? { ...t, conversation: { ...t.conversation, status: next } } : t));
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Messages" description="Customer support conversations" />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Customer messages from the storefront chat will appear here."
        />
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* Conversation list */}
          <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b border-border-light dark:border-border-dark px-4 py-3 text-left transition-colors',
                  selectedId === c.id
                    ? 'bg-primary/5 dark:bg-accent/10'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink dark:text-white">
                    {c.customer.name}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-neutral-500">{c.lastMessageBody}</span>
                  {c.unreadByAdmin > 0 && (
                    <Badge className="shrink-0 h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">
                      {c.unreadByAdmin}
                    </Badge>
                  )}
                </div>
                {c.status === 'closed' && (
                  <span className="text-[11px] uppercase tracking-wide text-neutral-400">Closed</span>
                )}
              </button>
            ))}
          </div>

          {/* Thread */}
          <div className="flex flex-1 min-w-0 flex-col rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
                Select a conversation
              </div>
            ) : !thread ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink dark:text-white">
                      {thread.customer.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{thread.customer.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleStatus}>
                    {thread.conversation.status === 'open' ? (
                      <><Archive className="mr-1.5 h-4 w-4" /> Close</>
                    ) : (
                      <><ArchiveRestore className="mr-1.5 h-4 w-4" /> Reopen</>
                    )}
                  </Button>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.messages.map((m) => (
                    <div key={m.id} className={m.senderRole === 'staff' ? 'flex justify-end' : ''}>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                          m.senderRole === 'staff'
                            ? 'rounded-br-md bg-primary text-white dark:bg-accent dark:text-primary'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-ink dark:text-neutral-100 w-fit'
                        )}
                      >
                        {m.body}
                        <p className={cn(
                          'mt-1 text-[10px]',
                          m.senderRole === 'staff' ? 'text-white/60 dark:text-primary/60' : 'text-neutral-400'
                        )}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border-light dark:border-border-dark p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      maxLength={2000}
                      placeholder="Reply to customer…"
                      className="flex-1 rounded-md border border-border-light dark:border-border-dark bg-transparent px-3 py-2 text-sm text-ink dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-accent"
                    />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/admin/UnreadMessagesBadge.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/admin-fetch';

const POLL_MS = 10000;

/** Total-unread pill for the Messages nav item. Polls the admin support API. */
export function UnreadMessagesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiFetch<{ totalUnread: number }>('/api/admin/support');
        if (!cancelled) setCount(data.totalUnread);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary dark:bg-accent px-1.5 text-[11px] font-semibold text-white dark:text-primary">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

- [ ] **Step 4: Add nav item in `components/admin/nav-config.ts`**

Add `MessageSquare` to the lucide-react import list, then add to `NAV_ITEMS` in the Sales group (after Customers):

```ts
{ label: 'Messages', href: '/admin/messages', icon: MessageSquare, module: 'support', group: 'Sales' },
```

- [ ] **Step 5: Render badge in `components/admin/Sidebar.tsx`**

Import at top:

```ts
import { UnreadMessagesBadge } from './UnreadMessagesBadge';
```

Inside the nav item `<Link>`, after `{!collapsed && <span className="truncate">{item.label}</span>}` (line ~74), add:

```tsx
{!collapsed && item.href === '/admin/messages' && <UnreadMessagesBadge />}
```

- [ ] **Step 6: Verify compile + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/admin/messages components/admin/UnreadMessagesBadge.tsx components/admin/nav-config.ts components/admin/Sidebar.tsx
git commit -m "feat: add admin messages page with unread nav badge"
```

---

### Task 9: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds, `/admin/messages` and `/api/support` appear in the route list.

- [ ] **Step 2: Manual flow** (with `npm run dev` running)

1. Storefront (`/en`), signed in as CUSTOMER: open chat → Support tab → send "Hello, is the case in stock?" → message appears.
2. Admin (`/admin`), signed in as SUPER_ADMIN or STORE_MANAGER: sidebar shows "Messages" with badge `1` → open → conversation listed with preview → open thread → badge clears → reply "Yes, in stock." → appears right-aligned.
3. Storefront: within ~4 s reply appears in Support tab.
4. Close conversation in admin → customer sends another message → conversation reopens (status open, back in list flow).
5. Role guards: `curl -s http://localhost:3000/api/admin/support` (no cookie) → 401. Signed in as CONTENT_EDITOR: no "Messages" in sidebar; direct API call returns 403.
6. Off-hours check: temporarily verify banner logic by confirming current Tbilisi time against `isSupportOnline` expectation (or rerun Task 1 script). Widget shows green "Online" during 11:00–20:00 Mon–Sat, amber offline banner otherwise.

- [ ] **Step 3: Report results to user** — list what passed/failed; fix failures before closing.
