# Services Page + Admin CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-editable public Services page (film-application services + location map) to the MoBax storefront, plus a "Services" nav link.

**Architecture:** Follows the existing DB-backed admin CMS pattern — Mongoose models in `models/`, Zod schemas in `lib/validations.ts`, admin API routes guarded by `requireAdmin({ module: 'content' })` using `ok`/`fail` envelopes, admin client UIs using `apiFetch` + `SingleImageUploader`. The Services storefront page is the first storefront surface to read live from MongoDB (products/categories stay on mock-data, unchanged).

**Tech Stack:** Next.js 14 App Router, TypeScript, Mongoose/MongoDB, Zod, next-intl, Tailwind, existing admin components (`SingleImageUploader`, `apiFetch`, `requireAdmin`, `logActivity`).

## Global Constraints

- Every user-facing string must have EN + KA. Storefront reads `locale` from route params and picks `*En`/`*Ka` fields; static UI strings go in `messages/en.json` + `messages/ka.json`.
- Admin API routes: guard with `requireAdmin({ module: 'content' })`, wrap in try/catch mapping `AdminAuthError` → `fail(err.message, err.status)`, use `ok()`/`fail()` from `@/lib/api`, call `connectDB()` first, add `export const dynamic = 'force-dynamic'`.
- Admin mutations call `logActivity(session, action, entityType, entityId, meta)`.
- Admin client fetches use `apiFetch<T>(url, opts)` from `@/lib/admin-fetch` (returns the `data` payload, throws on `success:false`).
- Model files use the `mongoose.models.X || mongoose.model(...)` guard (hot-reload safe).
- No automated test suite exists (Phase 1). Each task's verification is a runtime check (typecheck + curl/render/admin action). Dev server runs on **http://localhost:3001**.
- `mapEmbedUrl` must start with `https://www.google.com/maps/embed` or be empty (iframe-injection guard).
- Real MOBAX map embed URL (Tbilisi):
  `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2409.147724542609!2d44.815260175260974!3d41.792993271251156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1783496076755!5m2!1sen!2sge`

## File Structure

- Create `models/Service.ts` — per-service document (CRUD, orderable)
- Create `models/ServicePage.ts` — single-doc page content (heading/intro/map/address)
- Modify `lib/validations.ts` — add `CreateServiceSchema`, `UpdateServiceSchema`, `UpdateServicePageSchema` + inferred types
- Create `app/api/admin/services/route.ts` — GET list, POST create
- Create `app/api/admin/services/[id]/route.ts` — PUT update, DELETE
- Create `app/api/admin/service-page/route.ts` — GET, PUT upsert
- Modify `components/admin/nav-config.ts` — add Services nav item
- Create `app/admin/services/page.tsx` — admin server wrapper
- Create `app/admin/services/ServicesClient.tsx` — admin editor UI
- Create `lib/services-data.ts` — server-side read helpers for storefront (`getActiveServices`, `getServicePage`)
- Create `app/[locale]/(shop)/services/page.tsx` — public Services page
- Modify `components/layout/Navbar.tsx` — desktop + mobile "Services" link
- Modify `components/layout/Footer.tsx` — Services link
- Modify `messages/en.json` + `messages/ka.json` — `services` namespace
- Modify `scripts/seed.ts` — seed 2 services + ServicePage doc

---

### Task 1: Service + ServicePage models

**Files:**
- Create: `models/Service.ts`
- Create: `models/ServicePage.ts`

**Interfaces:**
- Produces: `IService` (`{ _id, titleEn, titleKa, descriptionEn, descriptionKa, image, order, isActive, createdAt, updatedAt }`), default export `Service` (Mongoose model). `IServicePage` (`{ _id, key:'services', headingEn, headingKa, introEn, introKa, mapEmbedUrl, addressEn, addressKa, updatedBy?, createdAt, updatedAt }`), default export `ServicePage`.

- [ ] **Step 1: Write `models/Service.ts`**

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    titleEn: { type: String, required: true, trim: true },
    titleKa: { type: String, required: true, trim: true },
    descriptionEn: { type: String, default: '' },
    descriptionKa: { type: String, default: '' },
    image: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service: Model<IService> =
  (mongoose.models.Service as Model<IService>) || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
```

- [ ] **Step 2: Write `models/ServicePage.ts`**

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServicePage extends Document {
  key: 'services';
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServicePageSchema = new Schema<IServicePage>(
  {
    key: { type: String, enum: ['services'], required: true, unique: true, default: 'services' },
    headingEn: { type: String, default: '' },
    headingKa: { type: String, default: '' },
    introEn: { type: String, default: '' },
    introKa: { type: String, default: '' },
    mapEmbedUrl: { type: String, default: '' },
    addressEn: { type: String, default: '' },
    addressKa: { type: String, default: '' },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const ServicePage: Model<IServicePage> =
  (mongoose.models.ServicePage as Model<IServicePage>) ||
  mongoose.model<IServicePage>('ServicePage', ServicePageSchema);

export default ServicePage;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit** (skip if repo not git-init; note in report)

```bash
git add models/Service.ts models/ServicePage.ts && git commit -m "feat: add Service and ServicePage models"
```

---

### Task 2: Zod validation schemas

**Files:**
- Modify: `lib/validations.ts` (append near other admin schemas, before the trailing type-export block)

**Interfaces:**
- Consumes: `z` (already imported top of file).
- Produces: `CreateServiceSchema`, `UpdateServiceSchema`, `UpdateServicePageSchema`, and types `CreateServiceInput`, `UpdateServiceInput`, `UpdateServicePageInput`.

- [ ] **Step 1: Append schemas to `lib/validations.ts`**

Add this block after the Team/Customers admin section (anywhere among the admin schemas is fine; place it just before the final `export type CreateCategoryInput ...` group is not required — just ensure it is top-level):

```typescript
// --- Services (storefront services page) admin ---

const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed';

export const CreateServiceSchema = z.object({
  titleEn: z.string().min(1, 'English title is required').max(160),
  titleKa: z.string().min(1, 'Georgian title is required').max(160),
  descriptionEn: z.string().max(5000).default(''),
  descriptionKa: z.string().max(5000).default(''),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).default(''),
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present.
export const UpdateServiceSchema = CreateServiceSchema.partial();

export const UpdateServicePageSchema = z.object({
  headingEn: z.string().max(300).default(''),
  headingKa: z.string().max(300).default(''),
  introEn: z.string().max(2000).default(''),
  introKa: z.string().max(2000).default(''),
  mapEmbedUrl: z
    .string()
    .refine(
      (v) => v === '' || v.startsWith(MAP_EMBED_PREFIX),
      'Must be a Google Maps embed URL (https://www.google.com/maps/embed...)'
    )
    .default(''),
  addressEn: z.string().max(500).default(''),
  addressKa: z.string().max(500).default(''),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type UpdateServicePageInput = z.infer<typeof UpdateServicePageSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/validations.ts && git commit -m "feat: add service validation schemas"
```

---

### Task 3: Services admin API — list + create

**Files:**
- Create: `app/api/admin/services/route.ts`

**Interfaces:**
- Consumes: `Service` (Task 1), `CreateServiceSchema` (Task 2), `requireAdmin`, `AdminAuthError`, `ok`, `fail`, `logActivity`, `connectDB`.
- Produces: `GET /api/admin/services` → `ok({ services })` (all, sorted by `order` asc then `createdAt`); `POST` → `ok(created, 201)`.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateServiceSchema } from '@/lib/validations';
import Service from '@/models/Service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const services = await Service.find().sort({ order: 1, createdAt: 1 }).lean();
    return ok({ services });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services GET]', err);
    return fail('Failed to load services', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = CreateServiceSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid service data', 422);
    }
    const created = await Service.create(parsed.data);
    await logActivity(session, 'service.create', 'Service', String(created._id), {
      titleEn: created.titleEn,
    });
    return ok(created.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services POST]', err);
    return fail('Failed to create service', 500);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Verify route compiles (dev server)**

With dev server running on :3001, run:
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/admin/services`
Expected: `401` or `403` (auth guard active — route compiles, rejects unauthenticated). NOT 500.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/services/route.ts && git commit -m "feat: add services list/create admin API"
```

---

### Task 4: Services admin API — update + delete

**Files:**
- Create: `app/api/admin/services/[id]/route.ts`

**Interfaces:**
- Consumes: `Service`, `UpdateServiceSchema`, admin helpers.
- Produces: `PUT/PATCH /api/admin/services/:id` → `ok(updated)`; `DELETE` → `ok({ id })`.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateServiceSchema } from '@/lib/validations';
import Service from '@/models/Service';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

async function update(req: NextRequest, { params }: Params) {
  const session = await requireAdmin({ module: 'content' });
  await connectDB();
  const json = await req.json();
  const parsed = UpdateServiceSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid service data', 422);
  }
  const updated = await Service.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return fail('Service not found', 404);
  await logActivity(session, 'service.update', 'Service', params.id, {});
  return ok(updated);
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id PUT]', err);
    return fail('Failed to update service', 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id PATCH]', err);
    return fail('Failed to update service', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const deleted = await Service.findByIdAndDelete(params.id).lean();
    if (!deleted) return fail('Service not found', 404);
    await logActivity(session, 'service.delete', 'Service', params.id, {});
    return ok({ id: params.id });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id DELETE]', err);
    return fail('Failed to delete service', 500);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/services/[id]/route.ts" && git commit -m "feat: add service update/delete admin API"
```

---

### Task 5: Service page content admin API

**Files:**
- Create: `app/api/admin/service-page/route.ts`

**Interfaces:**
- Consumes: `ServicePage` (Task 1), `UpdateServicePageSchema` (Task 2), admin helpers.
- Produces: `GET /api/admin/service-page` → `ok(doc)` (create-on-read default shell if absent); `PUT` → `ok(doc)` (upsert single doc keyed `key:'services'`).

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateServicePageSchema } from '@/lib/validations';
import ServicePage from '@/models/ServicePage';

export const dynamic = 'force-dynamic';

const EMPTY = {
  key: 'services' as const,
  headingEn: '',
  headingKa: '',
  introEn: '',
  introKa: '',
  mapEmbedUrl: '',
  addressEn: '',
  addressKa: '',
};

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const doc = await ServicePage.findOne({ key: 'services' }).lean();
    return ok(doc ?? EMPTY);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/service-page GET]', err);
    return fail('Failed to load service page', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = UpdateServicePageSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid page data', 422);
    }
    const doc = await ServicePage.findOneAndUpdate(
      { key: 'services' },
      { $set: { ...parsed.data, key: 'services', updatedBy: session.user.id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    await logActivity(session, 'servicePage.update', 'ServicePage', 'services', {});
    return ok(doc);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/service-page PUT]', err);
    return fail('Failed to save service page', 500);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/service-page/route.ts && git commit -m "feat: add service page content admin API"
```

---

### Task 6: Register Services in admin nav

**Files:**
- Modify: `components/admin/nav-config.ts`

**Interfaces:**
- Consumes: existing `NAV_ITEMS`, `Wrench` icon from lucide-react.
- Produces: Services nav item visible in admin sidebar under Storefront.

- [ ] **Step 1: Add `Wrench` to the lucide import**

In the import block at top, add `Wrench,` alongside the other icons (e.g. after `FileText,`).

- [ ] **Step 2: Add the nav item**

Insert after the `Content` item in `NAV_ITEMS`:

```typescript
  { label: 'Services', href: '/admin/services', icon: Wrench, module: 'content', group: 'Storefront' },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/admin/nav-config.ts && git commit -m "feat: add Services to admin nav"
```

---

### Task 7: Admin Services editor UI

**Files:**
- Create: `app/admin/services/page.tsx`
- Create: `app/admin/services/ServicesClient.tsx`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/admin-fetch`, `SingleImageUploader` from `@/components/admin/SingleImageUploader`, UI primitives (`Button`, `Input`, `Label`, `Switch` from `@/components/ui/*` — match imports used in `app/admin/categories/CategoriesClient.tsx`), `IService`/`IServicePage` shapes (use inline types below — client can't import Mongoose Documents).
- API shapes: GET `/api/admin/services` → `{ services: ServiceRow[] }`; GET `/api/admin/service-page` → `PageContent`.
- Produces: full admin editing surface at `/admin/services`.

- [ ] **Step 1: Write the server wrapper `app/admin/services/page.tsx`**

Match the pattern of `app/admin/categories/page.tsx` (open it to copy the wrapper shape — typically a thin server component rendering the client). Write:

```tsx
import ServicesClient from './ServicesClient';

export const dynamic = 'force-dynamic';

export default function AdminServicesPage() {
  return <ServicesClient />;
}
```

- [ ] **Step 2: Write `app/admin/services/ServicesClient.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/admin-fetch';
import { SingleImageUploader } from '@/components/admin/SingleImageUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type ServiceRow = {
  _id: string;
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
  isActive: boolean;
};

type PageContent = {
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
};

const EMPTY_SERVICE: Omit<ServiceRow, '_id'> = {
  titleEn: '', titleKa: '', descriptionEn: '', descriptionKa: '',
  image: '', order: 0, isActive: true,
};

const EMPTY_PAGE: PageContent = {
  headingEn: '', headingKa: '', introEn: '', introKa: '',
  mapEmbedUrl: '', addressEn: '', addressKa: '',
};

export default function ServicesClient() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [page, setPage] = useState<PageContent>(EMPTY_PAGE);
  const [editing, setEditing] = useState<ServiceRow | Omit<ServiceRow, '_id'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(false);
  const [savingService, setSavingService] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        apiFetch<{ services: ServiceRow[] }>('/api/admin/services'),
        apiFetch<PageContent>('/api/admin/service-page'),
      ]);
      setServices(s.services);
      setPage({ ...EMPTY_PAGE, ...p });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function savePage() {
    setSavingPage(true);
    try {
      await apiFetch('/api/admin/service-page', {
        method: 'PUT',
        body: JSON.stringify(page),
      });
      toast.success('Page content saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPage(false);
    }
  }

  async function saveService() {
    if (!editing) return;
    setSavingService(true);
    try {
      const isNew = !('_id' in editing);
      if (isNew) {
        await apiFetch('/api/admin/services', { method: 'POST', body: JSON.stringify(editing) });
      } else {
        await apiFetch(`/api/admin/services/${(editing as ServiceRow)._id}`, {
          method: 'PUT',
          body: JSON.stringify(editing),
        });
      }
      toast.success('Service saved');
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingService(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service?')) return;
    try {
      await apiFetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      toast.success('Service deleted');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function setField<K extends keyof PageContent>(k: K, v: PageContent[K]) {
    setPage((prev) => ({ ...prev, [k]: v }));
  }
  function setSvc<K extends keyof ServiceRow>(k: K, v: ServiceRow[K]) {
    setEditing((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  if (loading) return <div className="p-8 text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-semibold">Services</h1>

      {/* Page content */}
      <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-medium">Page content</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Heading (EN)</Label><Input value={page.headingEn} onChange={(e) => setField('headingEn', e.target.value)} /></div>
          <div><Label>Heading (KA)</Label><Input value={page.headingKa} onChange={(e) => setField('headingKa', e.target.value)} /></div>
          <div><Label>Intro (EN)</Label><Input value={page.introEn} onChange={(e) => setField('introEn', e.target.value)} /></div>
          <div><Label>Intro (KA)</Label><Input value={page.introKa} onChange={(e) => setField('introKa', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Map embed URL</Label><Input value={page.mapEmbedUrl} onChange={(e) => setField('mapEmbedUrl', e.target.value)} placeholder="https://www.google.com/maps/embed?..." /></div>
          <div><Label>Address (EN)</Label><Input value={page.addressEn} onChange={(e) => setField('addressEn', e.target.value)} /></div>
          <div><Label>Address (KA)</Label><Input value={page.addressKa} onChange={(e) => setField('addressKa', e.target.value)} /></div>
        </div>
        <Button onClick={savePage} disabled={savingPage}>{savingPage ? 'Saving…' : 'Save page content'}</Button>
      </section>

      {/* Services list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Services list</h2>
          <Button onClick={() => setEditing({ ...EMPTY_SERVICE, order: services.length })}>Add service</Button>
        </div>
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {services.length === 0 && <p className="p-4 text-sm text-neutral-400">No services yet.</p>}
          {services.map((s) => (
            <div key={s._id} className="flex items-center gap-4 p-4">
              {s.image ? <img src={s.image} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-neutral-100 dark:bg-neutral-800" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.titleEn}</p>
                <p className="text-xs text-neutral-400">order {s.order} · {s.isActive ? 'active' : 'hidden'}</p>
              </div>
              <Button variant="outline" onClick={() => setEditing(s)}>Edit</Button>
              <Button variant="destructive" onClick={() => deleteService(s._id)}>Delete</Button>
            </div>
          ))}
        </div>
      </section>

      {/* Editor */}
      {editing && (
        <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-medium">{'_id' in editing ? 'Edit service' : 'New service'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Title (EN)</Label><Input value={editing.titleEn} onChange={(e) => setSvc('titleEn', e.target.value)} /></div>
            <div><Label>Title (KA)</Label><Input value={editing.titleKa} onChange={(e) => setSvc('titleKa', e.target.value)} /></div>
            <div><Label>Description (EN)</Label><Input value={editing.descriptionEn} onChange={(e) => setSvc('descriptionEn', e.target.value)} /></div>
            <div><Label>Description (KA)</Label><Input value={editing.descriptionKa} onChange={(e) => setSvc('descriptionKa', e.target.value)} /></div>
            <div><Label>Order</Label><Input type="number" value={editing.order} onChange={(e) => setSvc('order', Number(e.target.value))} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={editing.isActive} onCheckedChange={(v) => setSvc('isActive', v)} /><Label>Active</Label></div>
            <div className="sm:col-span-2"><Label>Image</Label><SingleImageUploader value={editing.image} onChange={(url) => setSvc('image', url)} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveService} disabled={savingService}>{savingService ? 'Saving…' : 'Save service'}</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </section>
      )}
    </div>
  );
}
```

Note: before writing, open `app/admin/categories/CategoriesClient.tsx` to confirm the exact import paths/props for `Button` (variant names), `Switch`, and `toast`. Adjust the imports above to match what that file uses (this codebase's conventions win over the snippet).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. Fix any prop-name mismatches against the real UI components.

- [ ] **Step 4: Verify admin page renders**

With dev server on :3001 + logged in as admin, load `http://localhost:3001/admin/services`. Confirm: page content form + empty services list render, no console errors. (Or curl the route for a 200/redirect, not 500.)

- [ ] **Step 5: Commit**

```bash
git add app/admin/services/ && git commit -m "feat: add admin services editor UI"
```

---

### Task 8: Storefront data helpers

**Files:**
- Create: `lib/services-data.ts`

**Interfaces:**
- Consumes: `connectDB`, `Service`, `ServicePage`.
- Produces: `getActiveServices(): Promise<ServiceView[]>` (active only, ordered), `getServicePage(): Promise<ServicePageView>` (doc or defaults). `ServiceView` = plain object `{ _id, titleEn, titleKa, descriptionEn, descriptionKa, image, order }`. `ServicePageView` = `{ headingEn, headingKa, introEn, introKa, mapEmbedUrl, addressEn, addressKa }`.

- [ ] **Step 1: Write `lib/services-data.ts`**

```typescript
import { connectDB } from '@/lib/mongodb';
import Service from '@/models/Service';
import ServicePage from '@/models/ServicePage';

export type ServiceView = {
  _id: string;
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
};

export type ServicePageView = {
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
};

const DEFAULT_PAGE: ServicePageView = {
  headingEn: 'Invisible protection for your beloved device',
  headingKa: 'უხილავი დაცვა თქვენი საყვარელი მოწყობილობისთვის',
  introEn: '',
  introKa: '',
  mapEmbedUrl: '',
  addressEn: '',
  addressKa: '',
};

export async function getActiveServices(): Promise<ServiceView[]> {
  await connectDB();
  const docs = await Service.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  return docs.map((d) => ({
    _id: String(d._id),
    titleEn: d.titleEn,
    titleKa: d.titleKa,
    descriptionEn: d.descriptionEn,
    descriptionKa: d.descriptionKa,
    image: d.image,
    order: d.order,
  }));
}

export async function getServicePage(): Promise<ServicePageView> {
  await connectDB();
  const doc = await ServicePage.findOne({ key: 'services' }).lean();
  if (!doc) return DEFAULT_PAGE;
  return {
    headingEn: doc.headingEn || DEFAULT_PAGE.headingEn,
    headingKa: doc.headingKa || DEFAULT_PAGE.headingKa,
    introEn: doc.introEn,
    introKa: doc.introKa,
    mapEmbedUrl: doc.mapEmbedUrl,
    addressEn: doc.addressEn,
    addressKa: doc.addressKa,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/services-data.ts && git commit -m "feat: add storefront services data helpers"
```

---

### Task 9: i18n strings for services namespace

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ka.json`

**Interfaces:**
- Produces: `services` namespace with keys `navLabel`, `sectionServices`, `sectionLocation`, `getDirections`, `noServices`.

- [ ] **Step 1: Add `services` namespace to `messages/en.json`**

Add as a new top-level key (sibling of `home`, `checkout`, etc.):

```json
  "services": {
    "navLabel": "Services",
    "sectionServices": "Our Services",
    "sectionLocation": "Where to find us",
    "getDirections": "Get directions",
    "noServices": "Services coming soon."
  }
```

(Ensure valid JSON — add a trailing comma after the previous block if needed.)

- [ ] **Step 2: Add `services` namespace to `messages/ka.json`**

```json
  "services": {
    "navLabel": "სერვისები",
    "sectionServices": "ჩვენი სერვისები",
    "sectionLocation": "სად გვიპოვით",
    "getDirections": "მარშრუტის ნახვა",
    "noServices": "სერვისები მალე დაემატება."
  }
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "require('./messages/en.json'); require('./messages/ka.json'); console.log('ok')"`
Expected: prints `ok` (no parse error).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ka.json && git commit -m "feat: add services i18n strings"
```

---

### Task 10: Public Services storefront page

**Files:**
- Create: `app/[locale]/(shop)/services/page.tsx`

**Interfaces:**
- Consumes: `getActiveServices`, `getServicePage` (Task 8), `getTranslations`/`setRequestLocale` from `next-intl/server`, `next/image` optional (use plain `<img>` for external service images to avoid `next.config.js` remote-pattern setup — matches BeforeAfterSlider precedent).
- Produces: rendered page at `/[locale]/services`.

- [ ] **Step 1: Write the page**

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getActiveServices, getServicePage } from '@/lib/services-data';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: Props) {
  return { title: `MoBax — ${locale === 'ka' ? 'სერვისები' : 'Services'}` };
}

export default async function ServicesPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const isKa = locale === 'ka';
  const t = await getTranslations('services');
  const [services, page] = await Promise.all([getActiveServices(), getServicePage()]);

  const heading = isKa ? page.headingKa : page.headingEn;
  const intro = isKa ? page.introKa : page.introEn;
  const address = isKa ? page.addressKa : page.addressEn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-display text-ink dark:text-white sm:text-5xl">
          {heading}
        </h1>
        {intro && <p className="mt-4 text-lg text-graphite">{intro}</p>}
      </section>

      {/* Services grid */}
      <section className="mt-16">
        <h2 className="mb-8 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
          {t('sectionServices')}
        </h2>
        {services.length === 0 ? (
          <p className="text-graphite">{t('noServices')}</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2">
            {services.map((s) => {
              const title = isKa ? s.titleKa : s.titleEn;
              const desc = isKa ? s.descriptionKa : s.descriptionEn;
              return (
                <div
                  key={s._id}
                  className="overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
                >
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={title} className="aspect-video w-full object-cover" />
                  )}
                  <div className="p-6">
                    <h3 className="font-semibold text-ink dark:text-white">{title}</h3>
                    {desc && <p className="mt-2 text-sm text-graphite">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Location */}
      {page.mapEmbedUrl && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-display text-ink dark:text-white">
            {t('sectionLocation')}
          </h2>
          {address && <p className="mb-4 text-graphite">{address}</p>}
          <div className="overflow-hidden rounded-2xl border border-border-light dark:border-border-dark">
            <iframe
              src={page.mapEmbedUrl}
              className="h-[420px] w-full"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="MoBax location"
            />
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Verify page renders**

With dev server on :3001:
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/en/services` → expect `200`
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ka/services` → expect `200`
`curl -s http://localhost:3001/en/services | grep -o 'Invisible protection[^<]*'` → expect the default heading (before seeding).

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(shop)/services/page.tsx" && git commit -m "feat: add public services page"
```

---

### Task 11: Navbar + Footer Services link (Part 1)

**Files:**
- Modify: `components/layout/Navbar.tsx`
- Modify: `components/layout/Footer.tsx`

**Interfaces:**
- Consumes: existing `locale`, `Link`, `isActive` in Navbar; the `categories` link list in Footer.
- Produces: "Services" / "სერვისები" link routing to `/${locale}/services` in desktop nav, mobile menu, and footer.

- [ ] **Step 1: Add desktop nav link in `components/layout/Navbar.tsx`**

Immediately after the Categories mega-menu `</div>` (the one closing the block that starts at the `{/* Categories mega-menu */}` comment, around line 207) and before the closing `</nav>`, add:

```tsx
              {/* Services */}
              <Link
                href={`/${locale}/services`}
                className={`py-6 text-sm font-medium transition-colors ${
                  isActive(`/${locale}/services`)
                    ? 'text-ink dark:text-white'
                    : 'text-graphite hover:text-ink dark:hover:text-white'
                }`}
              >
                {locale === 'ka' ? 'სერვისები' : 'Services'}
              </Link>
```

- [ ] **Step 2: Add mobile menu link**

Find the mobile menu section in the same file (search for the mobile nav links — likely another set of `<Link>`s rendered when a mobile menu state is open). Add a matching Services link alongside the other mobile links, using the same class pattern the existing mobile links use. If no mobile menu link list exists, skip this step and note it in the report.

- [ ] **Step 3: Add Footer link in `components/layout/Footer.tsx`**

The footer has a `categories` array (line ~10). Do NOT add Services to that array (it's category links → `/products?category=`). Instead, find the footer's "shop" / quick-links column (search for other standalone `<Link href={`/${locale}/...`}>` in the footer JSX) and add:

```tsx
<Link href={`/${locale}/services`} className="hover:text-white transition-colors">
  {locale === 'ka' ? 'სერვისები' : 'Services'}
</Link>
```

matching the surrounding link markup. If the only footer link list is the categories array, add a new small "Services" link in the same column below it, wrapped to match existing styling.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Verify link renders + routes**

Load `http://localhost:3001/en` — confirm "Services" appears in the top nav between Categories and search. Click → lands on `/en/services` (200). Switch to KA → shows "სერვისები".

- [ ] **Step 6: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Footer.tsx && git commit -m "feat: add Services nav and footer links"
```

---

### Task 12: Seed services + page content

**Files:**
- Modify: `scripts/seed.ts`

**Interfaces:**
- Consumes: `Service`, `ServicePage` models; existing seed connection/teardown pattern in the file.
- Produces: 2 seeded services + 1 ServicePage doc after `npm run seed`.

- [ ] **Step 1: Import the models**

At the top of `scripts/seed.ts` with the other model imports, add:

```typescript
import Service from '../models/Service';
import ServicePage from '../models/ServicePage';
```

(Match the exact relative-path style the file already uses for model imports — check an existing import line and mirror it.)

- [ ] **Step 2: Add seeding logic**

In the main seed function, after the existing collection seeds (near where products/categories are inserted), add:

```typescript
  // --- Services ---
  await Service.deleteMany({});
  await Service.insertMany([
    {
      titleEn: 'Applying Screen Films',
      titleKa: 'ეკრანის ფილმის დაფენა',
      descriptionEn: 'Professional application of protective screen film with a bubble-free, precise fit for your device.',
      descriptionKa: 'დამცავი ეკრანის ფილმის პროფესიონალური დაფენა — უბუშტო, ზუსტი მორგება თქვენი მოწყობილობისთვის.',
      image: '',
      order: 0,
      isActive: true,
    },
    {
      titleEn: 'Applying Leather Films',
      titleKa: 'ტყავის ფილმის დაფენა',
      descriptionEn: 'Premium leather-texture back film applied by hand for a refined grip and scratch protection.',
      descriptionKa: 'პრემიუმ ტყავის ტექსტურის ზურგის ფილმა, ხელით დაფენილი — დახვეწილი შეხება და ნაკაწრებისგან დაცვა.',
      image: '',
      order: 1,
      isActive: true,
    },
  ]);

  // --- Service page content ---
  await ServicePage.findOneAndUpdate(
    { key: 'services' },
    {
      $set: {
        key: 'services',
        headingEn: 'Invisible protection for your beloved device',
        headingKa: 'უხილავი დაცვა თქვენი საყვარელი მოწყობილობისთვის',
        introEn: 'Bring your device to MoBax and let our specialists apply premium protective films while you wait.',
        introKa: 'მოიტანეთ თქვენი მოწყობილობა MoBax-ში და ჩვენი სპეციალისტები დააფენენ პრემიუმ დამცავ ფილმებს ლოდინის გარეშე.',
        mapEmbedUrl:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2409.147724542609!2d44.815260175260974!3d41.792993271251156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1783496076755!5m2!1sen!2sge',
        addressEn: 'MOBAX — phone accessories, Tbilisi',
        addressKa: 'MOBAX — ტელეფონის აქსესუარები, თბილისი',
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log('Seeded services + service page');
```

- [ ] **Step 3: Run the seed**

Run: `npm run seed`
Expected: completes without error, logs `Seeded services + service page`.

- [ ] **Step 4: Verify end-to-end on storefront**

`curl -s http://localhost:3001/en/services | grep -o 'Applying Screen Films'` → expect match
`curl -s http://localhost:3001/en/services | grep -o 'maps/embed'` → expect match (map iframe present)
`curl -s http://localhost:3001/ka/services | grep -o 'ეკრანის ფილმის დაფენა'` → expect match

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts && git commit -m "feat: seed services and service page content"
```

---

## Final verification (after all tasks)

- [ ] `npx tsc --noEmit` → exit 0
- [ ] `/en/services` + `/ka/services` render hero + 2 service cards + MOBAX map
- [ ] Nav "Services" link appears in both locales, routes correctly
- [ ] Admin `/admin/services`: edit a service description → save → reload storefront shows the change
- [ ] Admin: edit heading + address → save → storefront reflects it
- [ ] Admin: add a 3rd service → appears on storefront; delete it → disappears
- [ ] Hero badge shows "5+ Years of Experience" (done earlier); Protection Films category gone from Categories menu (done earlier)
```
