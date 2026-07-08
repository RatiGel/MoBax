# User Account / Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a signed-in customer account area (`/account`) with Profile (name, saved address, password change), Orders (list + detail), and Messages (support chat), plus checkout prefill from the saved address.

**Architecture:** New `/account` route group inside the existing `(shop)` group with a server-side auth guard and a shared sidebar. Three panels backed by new `/api/account/*` routes and a new `GET /api/orders` list; Messages reuses the existing `/api/support` API; Orders detail reuses a shared `OrderSummary` extracted from the current public tracking page. The `User` model gains an optional `address` subdocument, used to prefill the checkout form.

**Tech Stack:** Next.js 14 App Router · TypeScript · Mongoose · next-auth v5 · next-intl · Zod · bcryptjs · sonner (toast) · Tailwind · shadcn/ui.

## Global Constraints

- No test suite exists. Every task is verified **manually** via `npm run dev` (localhost:3000) and `npm run build` / `npm run lint` must pass. There is no unit-test runner to add tests to — do NOT scaffold one.
- All routes are locale-prefixed (`/en/...`, `/ka/...`). New pages live under `app/[locale]/(shop)/account/`.
- Every user-facing string MUST have both `en` and `ka` translations in `messages/en.json` and `messages/ka.json`. New namespace: `account`.
- Session access: `import { auth } from '@/auth'` (server); `useSession` / `signOut` from `next-auth/react` (client). API routes with a session return `401 { error }` when `!session?.user?.id`.
- Password hashing: `bcrypt` from `bcryptjs`, cost factor `12`. Password min length `8` (matches `RegisterSchema`).
- `passwordHash` MUST NEVER be serialized into any API response.
- Toasts: `import { toast } from 'sonner'`.
- Address field shape (canonical, from checkout / `OrderAddressSchema`): `firstName, lastName, phone, address, city, regionName, zipCode, country`. The profile address drops `email` (email lives on the user).
- Commit after each task. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Add `address` subdocument to the User model

**Files:**
- Modify: `models/User.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `IUser.address?: IUserAddress` where
  `IUserAddress = { firstName: string; lastName: string; phone: string; address: string; city: string; regionName?: string; zipCode?: string; country: string }`.

- [ ] **Step 1: Add the address interface + schema fields**

In `models/User.ts`, add above `IUser`:

```ts
export interface IUserAddress {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  regionName?: string;
  zipCode?: string;
  country: string;
}
```

Add `address?: IUserAddress;` to the `IUser` interface (after `image?`).

In `UserSchema`, add after the `image` field:

```ts
    address: {
      type: {
        firstName: String,
        lastName: String,
        phone: String,
        address: String,
        city: String,
        regionName: String,
        zipCode: String,
        country: String,
      },
      required: false,
      default: undefined,
    },
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors referencing `models/User.ts`.

- [ ] **Step 3: Commit**

```bash
git add models/User.ts
git commit -m "feat: add optional address subdocument to User model

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add profile & password Zod schemas

**Files:**
- Modify: `lib/validations.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ProfileAddressSchema` — Zod object matching `IUserAddress`.
  - `UpdateProfileSchema` → `{ firstName: string; lastName: string; address?: ProfileAddress | null }`.
  - `ChangePasswordSchema` → `{ currentPassword: string; newPassword: string }`.
  - Types `UpdateProfileInput`, `ChangePasswordInput`, `ProfileAddress`.

- [ ] **Step 1: Add the schemas**

In `lib/validations.ts`, after `OrderAddressSchema` (around line 26), add:

```ts
// Profile saved address — same shape as OrderAddressSchema minus email.
// Optional fields use .default('') so a partially-filled address still saves.
export const ProfileAddressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  regionName: z.string().default(''),
  zipCode: z.string().default(''),
  country: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  // null clears the saved address; omitted leaves it unchanged (handled in route).
  address: ProfileAddressSchema.nullable().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ProfileAddress = z.infer<typeof ProfileAddressSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations.ts
git commit -m "feat: add profile and password validation schemas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Profile API — `GET` / `PATCH /api/account/profile`

**Files:**
- Create: `app/api/account/profile/route.ts`

**Interfaces:**
- Consumes: `auth` from `@/auth`; `connectDB` from `@/lib/mongodb`; `User` from `@/models/User`; `UpdateProfileSchema` from `@/lib/validations`.
- Produces:
  - `GET` → `{ firstName, lastName, email, address: IUserAddress | null, hasPassword: boolean }`.
  - `PATCH` (body `UpdateProfileInput`) → `{ firstName, lastName, email, address, hasPassword }` (updated).

- [ ] **Step 1: Write the route**

Create `app/api/account/profile/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { UpdateProfileSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

function serialize(user: {
  firstName: string;
  lastName: string;
  email: string;
  address?: unknown;
  passwordHash?: string;
}) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    address: user.address ?? null,
    hasPassword: !!user.passwordHash,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById(session.user.id)
    .select('firstName lastName email address passwordHash')
    .lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serialize(user));
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  await connectDB();

  const update: Record<string, unknown> = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  };
  // address: object → set; null → clear; undefined → leave unchanged.
  if (parsed.data.address === null) update.address = undefined;
  else if (parsed.data.address) update.address = parsed.data.address;

  const user = await User.findByIdAndUpdate(session.user.id, update, {
    new: true,
    runValidators: true,
  })
    .select('firstName lastName email address passwordHash')
    .lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(serialize(user));
}
```

- [ ] **Step 2: Manually verify GET**

Run `npm run dev`. Log in as a customer. In the browser devtools console (same origin), run:

```js
await fetch('/api/account/profile').then(r => r.json())
```
Expected: `{ firstName, lastName, email, address: null, hasPassword: true }` (no `passwordHash` key present).

- [ ] **Step 3: Manually verify PATCH**

```js
await fetch('/api/account/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ firstName: 'Test', lastName: 'User',
    address: { firstName: 'Test', lastName: 'User', phone: '555', address: 'St 1',
      city: 'tbilisi', regionName: '', zipCode: '', country: 'Georgia' } }),
}).then(r => r.json())
```
Expected: returned object shows the new name + address; re-running the GET persists it.

- [ ] **Step 4: Commit**

```bash
git add app/api/account/profile/route.ts
git commit -m "feat: add GET/PATCH /api/account/profile

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Password API — `POST /api/account/password`

**Files:**
- Create: `app/api/account/password/route.ts`

**Interfaces:**
- Consumes: `auth`, `connectDB`, `User`, `ChangePasswordSchema`, `bcrypt` from `bcryptjs`.
- Produces: `POST` (body `ChangePasswordInput`) → `{ ok: true }` on success; `400 { error }` otherwise.

- [ ] **Step 1: Write the route**

Create `app/api/account/password/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { ChangePasswordSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id).select('passwordHash');
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Google-only accounts have no password to change.
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'This account signs in with Google and has no password.' },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await user.save();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manually verify wrong current password is rejected**

While logged in (devtools console):
```js
await fetch('/api/account/password', { method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newpass123' }),
}).then(r => r.status)
```
Expected: `400`.

- [ ] **Step 3: Manually verify a correct change**

Repeat with your real current password + a new password ≥ 8 chars. Expected: `200`. Then sign out and log back in with the new password — succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/account/password/route.ts
git commit -m "feat: add POST /api/account/password with bcrypt verify

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Orders list API — add `GET /api/orders`

**Files:**
- Modify: `app/api/orders/route.ts`

**Interfaces:**
- Consumes: `auth`, `connectDB`, `Order`.
- Produces: `GET /api/orders` → `{ orders: Array<{ _id, orderNumber, status, paymentStatus, total, createdAt, itemCount, firstImage }> }`, newest first, scoped to the session user.

- [ ] **Step 1: Add the GET handler**

In `app/api/orders/route.ts`, add `export const dynamic = 'force-dynamic';` near the top if not present, and add this handler (the existing `POST` stays unchanged):

```ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
  }

  await connectDB();
  const orders = await Order.find({ userId: session.user.id })
    .sort('-createdAt')
    .select('orderNumber status paymentStatus total createdAt items')
    .lean();

  const list = orders.map((o) => ({
    _id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    createdAt: o.createdAt,
    itemCount: o.items?.length ?? 0,
    firstImage: o.items?.[0]?.image ?? '',
  }));

  return NextResponse.json({ orders: list });
}
```

`auth` is already imported in this file (line 7). Confirm the import is present; if not, add `import { auth } from '@/auth';`.

- [ ] **Step 2: Manually verify**

Log in as a customer who has placed orders. Devtools console:
```js
await fetch('/api/orders').then(r => r.json())
```
Expected: `{ orders: [...] }` with only that user's orders, newest first. Logged out → `401`.

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: add GET /api/orders to list the session user's orders

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Account translations (`account` namespace)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ka.json`

**Interfaces:**
- Consumes: nothing.
- Produces: an `account` translation namespace used by Tasks 7–11. Keys listed below.

- [ ] **Step 1: Add the `account` namespace to `messages/en.json`**

Add a top-level `"account"` object (alongside existing namespaces):

```json
"account": {
  "title": "My account",
  "navProfile": "My profile",
  "navOrders": "Orders",
  "navMessages": "Messages",
  "signOut": "Sign out",
  "profileHeading": "Profile",
  "firstName": "First name",
  "lastName": "Last name",
  "email": "Email",
  "emailReadonly": "Your email is used to sign in and can't be changed here.",
  "addressHeading": "Default shipping address",
  "addressHint": "We'll use this to prefill checkout.",
  "phone": "Phone",
  "address": "Address",
  "city": "City",
  "regionName": "Town / village",
  "zipCode": "ZIP code (optional)",
  "country": "Country",
  "saveProfile": "Save changes",
  "saving": "Saving…",
  "profileSaved": "Profile saved",
  "profileError": "Couldn't save your profile",
  "passwordHeading": "Change password",
  "currentPassword": "Current password",
  "newPassword": "New password",
  "changePassword": "Change password",
  "passwordChanged": "Password changed",
  "passwordError": "Couldn't change your password",
  "passwordGoogle": "You sign in with Google, so there's no password to change.",
  "ordersHeading": "Your orders",
  "ordersEmpty": "You haven't placed any orders yet.",
  "ordersShopLink": "Start shopping",
  "orderNumber": "Order",
  "orderItems": "{count} item(s)",
  "orderView": "View order",
  "orderBackToList": "Back to orders",
  "messagesHeading": "Messages",
  "messagesOnline": "Support is online",
  "messagesOffline": "Support is offline — we'll reply during business hours",
  "messagesEmpty": "No messages yet. Send us a note and we'll get back to you.",
  "messagePlaceholder": "Type your message…",
  "messageSend": "Send",
  "messageSending": "Sending…",
  "messageError": "Couldn't send your message",
  "you": "You",
  "supportTeam": "Support",
  "loading": "Loading…"
}
```

- [ ] **Step 2: Add the same keys, Georgian, to `messages/ka.json`**

```json
"account": {
  "title": "ჩემი ანგარიში",
  "navProfile": "ჩემი პროფილი",
  "navOrders": "შეკვეთები",
  "navMessages": "შეტყობინებები",
  "signOut": "გასვლა",
  "profileHeading": "პროფილი",
  "firstName": "სახელი",
  "lastName": "გვარი",
  "email": "ელფოსტა",
  "emailReadonly": "თქვენი ელფოსტა გამოიყენება შესასვლელად და აქ ვერ შეიცვლება.",
  "addressHeading": "ნაგულისხმევი მიწოდების მისამართი",
  "addressHint": "გამოვიყენებთ გადახდის ველების წინასწარ შესავსებად.",
  "phone": "ტელეფონი",
  "address": "მისამართი",
  "city": "ქალაქი",
  "regionName": "დაბა / სოფელი",
  "zipCode": "საფოსტო ინდექსი (არასავალდებულო)",
  "country": "ქვეყანა",
  "saveProfile": "ცვლილებების შენახვა",
  "saving": "ინახება…",
  "profileSaved": "პროფილი შენახულია",
  "profileError": "პროფილის შენახვა ვერ მოხერხდა",
  "passwordHeading": "პაროლის შეცვლა",
  "currentPassword": "მიმდინარე პაროლი",
  "newPassword": "ახალი პაროლი",
  "changePassword": "პაროლის შეცვლა",
  "passwordChanged": "პაროლი შეიცვალა",
  "passwordError": "პაროლის შეცვლა ვერ მოხერხდა",
  "passwordGoogle": "თქვენ შედიხართ Google-ით, ამიტომ პაროლი არ არსებობს.",
  "ordersHeading": "თქვენი შეკვეთები",
  "ordersEmpty": "ჯერ არ განგითავსებიათ შეკვეთა.",
  "ordersShopLink": "დაიწყეთ ყიდვა",
  "orderNumber": "შეკვეთა",
  "orderItems": "{count} ნივთი",
  "orderView": "შეკვეთის ნახვა",
  "orderBackToList": "შეკვეთებზე დაბრუნება",
  "messagesHeading": "შეტყობინებები",
  "messagesOnline": "მხარდაჭერა ონლაინაა",
  "messagesOffline": "მხარდაჭერა ოფლაინაა — გიპასუხებთ სამუშაო საათებში",
  "messagesEmpty": "ჯერ არ არის შეტყობინებები. მოგვწერეთ და გიპასუხებთ.",
  "messagePlaceholder": "დაწერეთ შეტყობინება…",
  "messageSend": "გაგზავნა",
  "messageSending": "იგზავნება…",
  "messageError": "შეტყობინების გაგზავნა ვერ მოხერხდა",
  "you": "თქვენ",
  "supportTeam": "მხარდაჭერა",
  "loading": "იტვირთება…"
}
```

- [ ] **Step 3: Verify JSON is valid**

Run: `npm run build` (or `node -e "require('./messages/en.json');require('./messages/ka.json')"`)
Expected: no JSON parse error.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ka.json
git commit -m "i18n: add account namespace (en + ka)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Account layout + sidebar (auth guard)

**Files:**
- Create: `app/[locale]/(shop)/account/layout.tsx`
- Create: `components/account/AccountSidebar.tsx`

**Interfaces:**
- Consumes: `auth` from `@/auth`; `account` translations.
- Produces: a guarded layout wrapping all `/account/**` pages; `AccountSidebar` (client) with active-link nav + sign-out.

- [ ] **Step 1: Write the sidebar component**

Create `components/account/AccountSidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { User, Package, MessageSquare, LogOut } from 'lucide-react';

export function AccountSidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('account');

  const base = `/${locale}/account`;
  const items = [
    { href: base, label: t('navProfile'), icon: User, exact: true },
    { href: `${base}/orders`, label: t('navOrders'), icon: Package, exact: false },
    { href: `${base}/messages`, label: t('navMessages'), icon: MessageSquare, exact: false },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-1 sm:overflow-visible">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
            isActive(href, href === base)
              ? 'bg-cobalt text-white'
              : 'text-graphite hover:bg-cloud-light dark:hover:bg-cloud-dark'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <button
        onClick={() => signOut({ callbackUrl: `/${locale}` })}
        className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/10"
      >
        <LogOut className="h-4 w-4" />
        {t('signOut')}
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Write the guarded layout**

Create `app/[locale]/(shop)/account/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { AccountSidebar } from '@/components/account/AccountSidebar';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/account`);
  }
  const t = await getTranslations('account');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
        {t('title')}
      </h1>
      <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
        <aside className="sm:sticky sm:top-24 sm:self-start">
          <AccountSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify the guard**

Run `npm run dev`. Logged OUT, visit `/en/account` → redirected to `/en/login?callbackUrl=/en/account`. Logged IN, visit `/en/account` → renders the sidebar (Profile/Orders/Messages/Sign out) with an empty content area (the page comes in Task 8).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(shop\)/account/layout.tsx components/account/AccountSidebar.tsx
git commit -m "feat: add guarded /account layout with sidebar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Profile page (name, address, password)

**Files:**
- Create: `app/[locale]/(shop)/account/page.tsx`

**Interfaces:**
- Consumes: `GET`/`PATCH /api/account/profile`, `POST /api/account/password`, `account` translations, `CITIES` from `@/lib/shipping`.
- Produces: the Profile panel UI. No exports consumed by other tasks.

- [ ] **Step 1: Write the profile page**

Create `app/[locale]/(shop)/account/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Address = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  regionName: string;
  zipCode: string;
  country: string;
};

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', phone: '', address: '',
  city: '', regionName: '', zipCode: '', country: 'Georgia',
};

export default function ProfilePage() {
  const t = useTranslations('account');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (!res.ok) return;
        const data = await res.json();
        setEmail(data.email ?? '');
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setHasPassword(!!data.hasPassword);
        if (data.address) setAddr({ ...EMPTY_ADDRESS, ...data.address });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateAddr(field: keyof Address, value: string) {
    setAddr((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Only send the address if the required parts are filled, else null (clear).
      const complete =
        addr.firstName && addr.lastName && addr.phone && addr.address && addr.city && addr.country;
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, address: complete ? addr : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('profileSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profileError'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('passwordError'));
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <p className="text-sm text-graphite">{t('loading')}</p>;

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text'
  ) => (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-graphite">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Name + email */}
      <form onSubmit={saveProfile} className="space-y-5">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-white">{t('profileHeading')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', t('firstName'), firstName, setFirstName)}
          {field('lastName', t('lastName'), lastName, setLastName)}
        </div>
        <div>
          <Label className="mb-1.5 block text-graphite">{t('email')}</Label>
          <Input value={email} disabled className="rounded-xl opacity-70" />
          <p className="mt-1 text-xs text-graphite">{t('emailReadonly')}</p>
        </div>

        {/* Address */}
        <div className="space-y-4 border-t border-border-light pt-6 dark:border-border-dark">
          <div>
            <h3 className="font-medium text-ink dark:text-white">{t('addressHeading')}</h3>
            <p className="text-xs text-graphite">{t('addressHint')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('a-firstName', t('firstName'), addr.firstName, (v) => updateAddr('firstName', v))}
            {field('a-lastName', t('lastName'), addr.lastName, (v) => updateAddr('lastName', v))}
            {field('a-phone', t('phone'), addr.phone, (v) => updateAddr('phone', v), 'tel')}
            {field('a-city', t('city'), addr.city, (v) => updateAddr('city', v))}
          </div>
          {field('a-address', t('address'), addr.address, (v) => updateAddr('address', v))}
          <div className="grid gap-4 sm:grid-cols-3">
            {field('a-region', t('regionName'), addr.regionName, (v) => updateAddr('regionName', v))}
            {field('a-zip', t('zipCode'), addr.zipCode, (v) => updateAddr('zipCode', v))}
            {field('a-country', t('country'), addr.country, (v) => updateAddr('country', v))}
          </div>
        </div>

        <Button type="submit" disabled={savingProfile} className="rounded-full font-semibold">
          {savingProfile ? t('saving') : t('saveProfile')}
        </Button>
      </form>

      {/* Password */}
      <div className="border-t border-border-light pt-8 dark:border-border-dark">
        <h2 className="mb-4 font-display text-xl font-semibold text-ink dark:text-white">{t('passwordHeading')}</h2>
        {hasPassword ? (
          <form onSubmit={changePassword} className="max-w-sm space-y-4">
            {field('currentPassword', t('currentPassword'), currentPassword, setCurrentPassword, 'password')}
            {field('newPassword', t('newPassword'), newPassword, setNewPassword, 'password')}
            <Button type="submit" disabled={savingPassword} className="rounded-full font-semibold">
              {savingPassword ? t('saving') : t('changePassword')}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-graphite">{t('passwordGoogle')}</p>
        )}
      </div>
    </div>
  );
}
```

Note: the address `city` is a free-text `Input` here (not the checkout `Select`), because the checkout city dropdown values are internal keys and the profile is a simpler free-form save. Prefill in Task 12 only maps `city` into the dropdown when it matches a known key.

- [ ] **Step 2: Manually verify**

Log in, visit `/en/account`. Edit name + fill the address → Save → toast "Profile saved". Reload → values persist. Password account shows the password form; if testing a Google account, it shows the "sign in with Google" note. Wrong current password → error toast; correct → success toast + fields clear.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/\(shop\)/account/page.tsx
git commit -m "feat: add account profile page (name, address, password)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Extract `OrderSummary` component from the tracking page

**Files:**
- Create: `components/shop/OrderSummary.tsx`
- Modify: `app/[locale]/(shop)/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `formatPrice` from `@/lib/utils`.
- Produces: `OrderSummary` component:
  ```ts
  type OrderSummaryItem = { nameSnapshot: string; priceSnapshot: number; quantity: number; image: string };
  function OrderSummary(props: {
    items: OrderSummaryItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
  }): JSX.Element
  ```

- [ ] **Step 1: Create the component**

Create `components/shop/OrderSummary.tsx` with the items list + totals block currently inline in the tracking page (lines ~242–280):

```tsx
import { Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export type OrderSummaryItem = {
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  image: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-graphite">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function OrderSummary({
  items,
  subtotal,
  shippingCost,
  total,
  paymentMethod,
  paymentStatus,
}: {
  items: OrderSummaryItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}) {
  return (
    <div className="space-y-8">
      <div className="divide-y divide-border-light overflow-hidden rounded-2xl border border-border-light dark:divide-border-dark dark:border-border-dark">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cloud-light text-graphite dark:bg-cloud-dark">
                <Package className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink dark:text-white">{item.nameSnapshot}</p>
              <p className="text-sm text-graphite">
                {item.quantity} × {formatPrice(item.priceSnapshot)}
              </p>
            </div>
            <span className="font-medium tabular-nums text-ink dark:text-white">
              {formatPrice(item.priceSnapshot * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row label="Shipping" value={shippingCost === 0 ? 'Free' : formatPrice(shippingCost)} />
        <div className="flex justify-between border-t border-border-light pt-2 text-base font-semibold text-ink dark:border-border-dark dark:text-white">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <p className="pt-2 text-graphite">
          Payment: {paymentMethod} · {paymentStatus.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the inline block in the tracking page**

In `app/[locale]/(shop)/orders/[id]/page.tsx`:
1. Add `import { OrderSummary } from '@/components/shop/OrderSummary';` at the top.
2. Delete the two inline blocks: the `{/* Items */}` block and the `{/* Totals */}` block (the `<div className="rounded-2xl … divide-y …">…</div>` through the totals `<div className="space-y-1 text-sm">…</div>`).
3. In their place render:

```tsx
<OrderSummary
  items={order.items}
  subtotal={order.subtotal}
  shippingCost={order.shippingCost}
  total={order.total}
  paymentMethod={order.paymentMethod}
  paymentStatus={order.paymentStatus}
/>
```

4. Delete the now-unused local `Row` function at the bottom of the file and the now-unused `Package` import if nothing else uses it (the pickup card does not; verify with a search — if `Package` is still referenced elsewhere in the file, keep it).

- [ ] **Step 3: Manually verify no visual regression**

Run `npm run dev`. Place/track an order via `/en/orders/<id>?email=<email>` (or the post-checkout flow). The items list + totals render identically to before. Run `npm run lint` — no unused-var errors.

- [ ] **Step 4: Commit**

```bash
git add components/shop/OrderSummary.tsx app/[locale]/\(shop\)/orders/\[id\]/page.tsx
git commit -m "refactor: extract OrderSummary from the order tracking page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Account orders list + detail pages

**Files:**
- Create: `app/[locale]/(shop)/account/orders/page.tsx`
- Create: `app/[locale]/(shop)/account/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/orders`, `GET /api/orders/:id`, `OrderSummary` from `@/components/shop/OrderSummary`, `account` translations, `formatPrice`.
- Produces: the Orders list + detail UI. No exports.

- [ ] **Step 1: Write the orders list page**

Create `app/[locale]/(shop)/account/orders/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

type OrderRow = {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
  firstImage: string;
};

export default function AccountOrdersPage() {
  const locale = useLocale();
  const t = useTranslations('account');
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) { setOrders([]); return; }
      const data = await res.json();
      setOrders(data.orders ?? []);
    })();
  }, []);

  if (orders === null) return <p className="text-sm text-graphite">{t('loading')}</p>;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light p-10 text-center dark:border-border-dark">
        <p className="text-graphite">{t('ordersEmpty')}</p>
        <Link href={`/${locale}/products`} className="mt-3 inline-block font-semibold text-cobalt hover:underline dark:text-cobalt-dark">
          {t('ordersShopLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-ink dark:text-white">{t('ordersHeading')}</h2>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o._id}>
            <Link
              href={`/${locale}/account/orders/${o._id}`}
              className="flex items-center gap-4 rounded-2xl border border-border-light p-4 transition-colors hover:border-cobalt dark:border-border-dark"
            >
              {o.firstImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.firstImage} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cloud-light text-graphite dark:bg-cloud-dark">
                  <Package className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink dark:text-white">
                  {t('orderNumber')} {o.orderNumber}
                </p>
                <p className="text-sm text-graphite">
                  {new Date(o.createdAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US')} ·{' '}
                  {t('orderItems', { count: o.itemCount })} · {o.status.toLowerCase()}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-ink dark:text-white">
                {formatPrice(o.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write the order detail page**

Create `app/[locale]/(shop)/account/orders/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { OrderSummary } from '@/components/shop/OrderSummary';

type Order = {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber?: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  items: { nameSnapshot: string; priceSnapshot: number; quantity: number; image: string }[];
  createdAt: string;
};

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations('account');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setOrder(data.order);
    })();
  }, [id]);

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/account/orders`}
        className="inline-flex items-center gap-1 text-sm font-medium text-cobalt hover:underline dark:text-cobalt-dark"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('orderBackToList')}
      </Link>

      {error && <p className="text-sm text-error">{t('loading')}</p>}

      {order && (
        <>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink dark:text-white">
              {t('orderNumber')} {order.orderNumber}
            </h2>
            <p className="text-sm text-graphite">
              {new Date(order.createdAt).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US')} ·{' '}
              {order.status.toLowerCase()}
            </p>
          </div>

          {order.trackingNumber && (
            <div className="rounded-2xl border border-border-light p-4 text-sm dark:border-border-dark">
              <span className="text-graphite">Tracking number: </span>
              <span className="font-medium text-ink dark:text-white">{order.trackingNumber}</span>
            </div>
          )}

          <OrderSummary
            items={order.items}
            subtotal={order.subtotal}
            shippingCost={order.shippingCost}
            total={order.total}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

Log in as a customer with orders. Visit `/en/account/orders` → list shows your orders newest-first with image, number, date, item count, status, total. Empty account → empty state + shop link. Click a row → detail page shows the OrderSummary. Manually change the URL id to another user's order id → detail shows the "not found" text (API returns 404 for non-owner).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(shop\)/account/orders
git commit -m "feat: add account orders list and detail pages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Messages page (support chat)

**Files:**
- Create: `app/[locale]/(shop)/account/messages/page.tsx`
- Create: `components/account/MessagesPanel.tsx`

**Interfaces:**
- Consumes: `GET`/`POST /api/support`, `account` translations.
- Produces: the Messages panel UI. No exports beyond the page.

- [ ] **Step 1: Write the MessagesPanel client component**

Create `components/account/MessagesPanel.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Message = { id: string; senderRole: string; body: string; createdAt: string };

export function MessagesPanel() {
  const t = useTranslations('account');
  const [messages, setMessages] = useState<Message[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch('/api/support');
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setOnline(!!data.online);
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messageError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-border-light dark:border-border-dark">
      <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
        <h2 className="font-display text-lg font-semibold text-ink dark:text-white">{t('messagesHeading')}</h2>
        <p className={`text-xs ${online ? 'text-success' : 'text-graphite'}`}>
          {online ? t('messagesOnline') : t('messagesOffline')}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-graphite">{t('loading')}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-graphite">{t('messagesEmpty')}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === 'customer';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? 'bg-cobalt text-white'
                      : 'bg-cloud-light text-ink dark:bg-cloud-dark dark:text-white'
                  }`}
                >
                  <p className="mb-0.5 text-[11px] opacity-70">{mine ? t('you') : t('supportTeam')}</p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border-light p-3 dark:border-border-dark">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messagePlaceholder')}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-border-light bg-transparent px-3 py-2 text-sm outline-none focus:border-cobalt dark:border-border-dark"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent); }
          }}
        />
        <Button type="submit" disabled={sending || !draft.trim()} className="rounded-full font-semibold">
          <Send className="mr-1 h-4 w-4" />
          {sending ? t('messageSending') : t('messageSend')}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

Create `app/[locale]/(shop)/account/messages/page.tsx`:

```tsx
import { MessagesPanel } from '@/components/account/MessagesPanel';

export default function AccountMessagesPage() {
  return <MessagesPanel />;
}
```

- [ ] **Step 3: Manually verify**

Log in, visit `/en/account/messages`. Existing thread messages load (if any); online/offline badge reflects support hours. Send a message → it appears as a right-aligned bubble; confirm it also appears in the admin messages view and (if Telegram is configured) forwards to the team chat. Enter sends; Shift+Enter newlines.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(shop\)/account/messages components/account/MessagesPanel.tsx
git commit -m "feat: add account messages support chat page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Wire dropdown links + checkout prefill

**Files:**
- Modify: `components/layout/AccountMenu.tsx`
- Modify: `app/[locale]/(shop)/checkout/page.tsx`

**Interfaces:**
- Consumes: `GET /api/account/profile`; `CITIES` from `@/lib/shipping`.
- Produces: dropdown deep-links into `/account/*`; checkout form prefilled from the saved address.

- [ ] **Step 1: Add Profile + Messages links to the dropdown**

In `components/layout/AccountMenu.tsx`:
1. Add `Package` and `MessageSquare` to the `lucide-react` import (keep existing `User`, `LayoutDashboard`, `LogOut`).
2. Between the `DropdownMenuLabel`/separator and the admin block, insert:

```tsx
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account`} onClick={onNavigate} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            {ka ? 'ჩემი პროფილი' : 'My profile'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/orders`} onClick={onNavigate} className="cursor-pointer">
            <Package className="mr-2 h-4 w-4" />
            {ka ? 'შეკვეთები' : 'Orders'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/messages`} onClick={onNavigate} className="cursor-pointer">
            <MessageSquare className="mr-2 h-4 w-4" />
            {ka ? 'შეტყობინებები' : 'Messages'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
```

(The existing admin block and sign-out item stay after this.)

- [ ] **Step 2: Prefill checkout from the saved address**

In `app/[locale]/(shop)/checkout/page.tsx`:
1. Add `useEffect` to the React import (currently `import { useMemo, useState } from 'react';` → `import { useEffect, useMemo, useState } from 'react';`).
2. After the `form`/`errors` state and `selectCity` are defined (i.e. after the state declarations, before `validate`), add a one-time prefill effect. `CITIES` is already imported. Only map `city` into the form if it matches a known dropdown key, so the Select stays valid:

```tsx
  // Prefill from the signed-in user's saved profile address (one-time).
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (!res.ok) return;
        const data = await res.json();
        const a = data.address;
        if (!a || cancelled) return;
        const knownCity = CITIES.some((c) => c.value === a.city) ? a.city : '';
        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || a.firstName || '',
          lastName: prev.lastName || a.lastName || '',
          phone: prev.phone || a.phone || '',
          address: prev.address || a.address || '',
          city: prev.city || knownCity,
          regionName: prev.regionName || a.regionName || '',
          zipCode: prev.zipCode || a.zipCode || '',
          country: prev.country || a.country || 'Georgia',
        }));
      } catch {
        // Non-fatal: checkout works without prefill.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);
```

Note on `CITIES` shape: confirmed — each entry is `{ value, region, labelEn, labelKa, regionalFee? }`, so `.some((c) => c.value === a.city)` is correct.

- [ ] **Step 3: Manually verify**

Log in as a user with a saved address (set in Task 8). Open the dropdown → My profile / Orders / Messages links navigate correctly. Go to `/en/checkout` with items in cart → the address fields are prefilled; if the saved `city` matches a dropdown option it is selected, otherwise the dropdown is left unselected (no crash). A guest / user without a saved address sees a blank form. Run `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add components/layout/AccountMenu.tsx app/[locale]/\(shop\)/checkout/page.tsx
git commit -m "feat: wire account dropdown links and prefill checkout from saved address

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Final build + lint gate

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: End-to-end smoke**

With `npm run dev`, logged in as a customer:
1. `/account` → edit + save profile, change password (password account).
2. `/account/orders` → list + open a detail.
3. `/account/messages` → send a message.
4. `/checkout` → address prefilled from saved profile.
5. Logged out → `/account` redirects to login.

- [ ] **Step 4: Commit (if any lint/build fixes were needed)**

```bash
git add -A
git commit -m "chore: build + lint fixes for account feature

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Profile (name, address, password) → Tasks 1, 2, 3, 4, 8. ✓
- Saved address prefills checkout → Tasks 1, 12. ✓
- Orders list + detail under `/account`, keep public tracking → Tasks 5, 9, 10. ✓
- Messages consuming `/api/support` → Task 11. ✓
- Shared `/account` layout + sidebar, dropdown deep-links → Tasks 7, 12. ✓
- User model `address` subdoc → Task 1. ✓
- API routes (`/api/account/profile`, `/api/account/password`, `GET /api/orders`) → Tasks 3, 4, 5. ✓
- Password security (Google no-form, bcrypt verify, never return hash) → Tasks 3, 4, 8. ✓
- i18n en + ka → Task 6. ✓
- Error handling (auth guard, 401, empty states) → Tasks 7, 8, 10, 11. ✓
- Out of scope items → not implemented. ✓

**Placeholder scan:** No TBD/TODO/"add error handling" without code. Every code step has full code. `CITIES` shape (Task 12) verified against `lib/shipping.ts` — entries expose `.value`.

**Type consistency:** `IUserAddress` (Task 1) ↔ `ProfileAddressSchema` (Task 2) ↔ profile page `Address` type (Task 8) share the same 8 fields. `OrderSummary` prop type (Task 9) matches its consumers (Tasks 9, 10). Profile API `serialize` output shape (Task 3) matches profile page fetch (Task 8) and checkout prefill (Task 12). `GET /api/orders` row shape (Task 5) matches the list page `OrderRow` (Task 10).
