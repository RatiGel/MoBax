# Services Page Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a display-only "product catalog" to the storefront services page (image, bilingual name, "starts from XX GEL"), fully admin-managed (create / edit / delete + multi-image).

**Architecture:** New `CatalogProduct` Mongoose model, admin CRUD API mirroring the existing Services routes, a new admin section in `ServicesClient.tsx`, and a new storefront section in the services page. Independent of the storefront `Product` model — no cart/SKU/stock/checkout.

**Tech Stack:** Next.js 14 App Router · TypeScript · Mongoose (MongoDB) · Zod validation · Cloudinary upload · next-intl (EN/KA) · Tailwind · shadcn/ui.

## Global Constraints

- No automated test suite in this repo — every task is verified manually via `npm run build` + `npm run dev` browser checks. Never write a test file.
- Every user-facing string MUST exist in both `messages/en.json` and `messages/ka.json` under the `services` namespace.
- Admin API auth is `requireAdmin({ module: 'content' })` — same module as the Services routes.
- Use the shared `ok` / `fail` / `notFound` helpers from `@/lib/api`. All admin routes set `export const dynamic = 'force-dynamic'`.
- Mongoose model files use the guard `(mongoose.models.X as Model<IX>) || mongoose.model<IX>(...)`.
- Client components never receive Mongoose Documents — map to plain view objects with stringified `_id`.
- Price is a number field; storefront renders the localized "starts from" label — never store the label text.

---

### Task 1: CatalogProduct model + Zod schemas

**Files:**
- Create: `models/CatalogProduct.ts`
- Modify: `lib/validations.ts` (append after line 299, the Services schema block)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `models/CatalogProduct.ts` default export `CatalogProduct` (Mongoose model) and named interface `ICatalogProduct` with fields `nameEn, nameKa: string`, `descriptionEn, descriptionKa: string`, `images: string[]`, `priceFrom: number`, `order: number`, `isActive: boolean`, `createdAt, updatedAt: Date`.
  - `lib/validations.ts` exports `CreateCatalogProductSchema`, `UpdateCatalogProductSchema` (Zod objects) and types `CreateCatalogProductInput`, `UpdateCatalogProductInput`.

- [ ] **Step 1: Create the model**

Create `models/CatalogProduct.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICatalogProduct extends Document {
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  images: string[];
  priceFrom: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogProductSchema = new Schema<ICatalogProduct>(
  {
    nameEn: { type: String, required: true, trim: true },
    nameKa: { type: String, required: true, trim: true },
    descriptionEn: { type: String, default: '' },
    descriptionKa: { type: String, default: '' },
    images: [{ type: String }],
    priceFrom: { type: Number, required: true, min: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CatalogProduct: Model<ICatalogProduct> =
  (mongoose.models.CatalogProduct as Model<ICatalogProduct>) ||
  mongoose.model<ICatalogProduct>('CatalogProduct', CatalogProductSchema);

export default CatalogProduct;
```

- [ ] **Step 2: Add Zod schemas**

Append to the end of `lib/validations.ts` (after line 299):

```typescript
// --- Catalog products (storefront services page catalog) admin ---

export const CreateCatalogProductSchema = z.object({
  nameEn: z.string().min(1, 'English name is required').max(160),
  nameKa: z.string().min(1, 'Georgian name is required').max(160),
  descriptionEn: z.string().max(5000).default(''),
  descriptionKa: z.string().max(5000).default(''),
  images: z.array(z.string().url('Each image must be a valid URL')).default([]),
  priceFrom: z.coerce.number().min(0, 'Price must be 0 or more'),
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present.
export const UpdateCatalogProductSchema = CreateCatalogProductSchema.partial();

export type CreateCatalogProductInput = z.infer<typeof CreateCatalogProductSchema>;
export type UpdateCatalogProductInput = z.infer<typeof UpdateCatalogProductSchema>;
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds (or stops only at pre-existing unrelated errors). No error referencing `CatalogProduct` or `validations.ts`.

- [ ] **Step 4: Commit**

```bash
git add models/CatalogProduct.ts lib/validations.ts
git commit -m "feat: CatalogProduct model and validation schemas"
```

---

### Task 2: Admin API routes (list / create / update / delete)

**Files:**
- Create: `app/api/admin/catalog/route.ts`
- Create: `app/api/admin/catalog/[id]/route.ts`

**Interfaces:**
- Consumes: `CatalogProduct` model and `CreateCatalogProductSchema` / `UpdateCatalogProductSchema` from Task 1.
- Produces: REST endpoints:
  - `GET  /api/admin/catalog` → `ok({ products })` where `products` is all docs sorted `{ order: 1, createdAt: 1 }` (lean).
  - `POST /api/admin/catalog` → `ok(created.toObject(), 201)`.
  - `PUT|PATCH /api/admin/catalog/:id` → `ok(updated)`.
  - `DELETE /api/admin/catalog/:id` → `ok({ id })`.

- [ ] **Step 1: Create the collection route**

Create `app/api/admin/catalog/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateCatalogProductSchema } from '@/lib/validations';
import CatalogProduct from '@/models/CatalogProduct';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const products = await CatalogProduct.find().sort({ order: 1, createdAt: 1 }).lean();
    return ok({ products });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog GET]', err);
    return fail('Failed to load catalog products', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = CreateCatalogProductSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid catalog product data', 422);
    }
    const created = await CatalogProduct.create(parsed.data);
    await logActivity(session, 'catalog.create', 'CatalogProduct', String(created._id), {
      nameEn: created.nameEn,
    });
    return ok(created.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog POST]', err);
    return fail('Failed to create catalog product', 500);
  }
}
```

- [ ] **Step 2: Create the item route**

Create `app/api/admin/catalog/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateCatalogProductSchema } from '@/lib/validations';
import CatalogProduct from '@/models/CatalogProduct';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function update(req: NextRequest, { params }: Params) {
  const session = await requireAdmin({ module: 'content' });
  await connectDB();
  if (!isValidId(params.id)) return notFound('Catalog product not found');
  const json = await req.json();
  const parsed = UpdateCatalogProductSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid catalog product data', 422);
  }
  const updated = await CatalogProduct.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return notFound('Catalog product not found');
  await logActivity(session, 'catalog.update', 'CatalogProduct', params.id, {
    fields: Object.keys(parsed.data),
  });
  return ok(updated);
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id PUT]', err);
    return fail('Failed to update catalog product', 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id PATCH]', err);
    return fail('Failed to update catalog product', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Catalog product not found');
    const deleted = await CatalogProduct.findByIdAndDelete(params.id).lean();
    if (!deleted) return notFound('Catalog product not found');
    await logActivity(session, 'catalog.delete', 'CatalogProduct', params.id, {});
    return ok({ id: params.id });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/catalog/:id DELETE]', err);
    return fail('Failed to delete catalog product', 500);
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds. No errors referencing `admin/catalog`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/catalog
git commit -m "feat: admin catalog CRUD API routes"
```

---

### Task 3: Storefront data loader

**Files:**
- Modify: `lib/services-data.ts` (add export + type; place after the `getActiveServices` block)

**Interfaces:**
- Consumes: `CatalogProduct` model from Task 1; `connectDB` (already imported in this file).
- Produces:
  - Exported type `CatalogProductView = { _id, nameEn, nameKa, descriptionEn, descriptionKa, images: string[], priceFrom: number, order: number }`.
  - Exported async `getActiveCatalogProducts(): Promise<CatalogProductView[]>`.

- [ ] **Step 1: Add the import**

At the top of `lib/services-data.ts`, add alongside the existing model imports:

```typescript
import CatalogProduct from '@/models/CatalogProduct';
```

- [ ] **Step 2: Add the type and loader**

Append to `lib/services-data.ts`:

```typescript
export type CatalogProductView = {
  _id: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  images: string[];
  priceFrom: number;
  order: number;
};

export async function getActiveCatalogProducts(): Promise<CatalogProductView[]> {
  await connectDB();
  const docs = await CatalogProduct.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return docs.map((d) => ({
    _id: String(d._id),
    nameEn: d.nameEn,
    nameKa: d.nameKa,
    descriptionEn: d.descriptionEn,
    descriptionKa: d.descriptionKa,
    images: d.images ?? [],
    priceFrom: d.priceFrom,
    order: d.order,
  }));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds. No errors referencing `services-data.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/services-data.ts
git commit -m "feat: getActiveCatalogProducts storefront loader"
```

---

### Task 4: i18n strings

**Files:**
- Modify: `messages/en.json` (`services` namespace)
- Modify: `messages/ka.json` (`services` namespace)

**Interfaces:**
- Consumes: nothing.
- Produces: translation keys `services.sectionCatalog` and `services.startsFrom` in both locales. `startsFrom` takes a `{price}` interpolation.

- [ ] **Step 1: Add EN keys**

In `messages/en.json`, inside the existing `"services"` object, add:

```json
"sectionCatalog": "Product catalog",
"startsFrom": "Starts from {price} ₾"
```

- [ ] **Step 2: Add KA keys**

In `messages/ka.json`, inside the existing `"services"` object, add:

```json
"sectionCatalog": "პროდუქტების კატალოგი",
"startsFrom": "იწყება {price} ₾-დან"
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ka.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/ka.json
git commit -m "feat: i18n strings for services catalog section"
```

---

### Task 5: Admin UI — catalog section in ServicesClient

**Files:**
- Modify: `app/admin/services/ServicesClient.tsx`

**Interfaces:**
- Consumes: `/api/admin/catalog` endpoints (Task 2); `ImageUploader` from `@/components/admin/ImageUploader`; existing `apiFetch`, `DataTable`, `Dialog`, `ConfirmDialog`, `Field`, `Button`, `Input`, `Textarea`, `Switch`, `Badge`, `toast` already imported or importable in this file.
- Produces: no exports consumed elsewhere; adds a "Product catalog" section rendered inside the existing `ServicesClient` component.

- [ ] **Step 1: Add imports**

At the top of `app/admin/services/ServicesClient.tsx`, add the multi-image uploader import (near the `SingleImageUploader` import):

```typescript
import { ImageUploader } from '@/components/admin/ImageUploader';
```

Add `Package` to the existing `lucide-react` import (used as the catalog icon):

```typescript
import { Plus, Pencil, Trash2, Wrench, Loader2, Package } from 'lucide-react';
```

- [ ] **Step 2: Add catalog types + empty form**

After the existing `EMPTY_PAGE` constant in `ServicesClient.tsx`, add:

```typescript
export interface CatalogRow {
  _id: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  images: string[];
  priceFrom: number;
  order: number;
  isActive: boolean;
}

interface CatalogFormValues {
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  images: string[];
  priceFrom: number;
  order: number;
  isActive: boolean;
}

const EMPTY_CATALOG_FORM: CatalogFormValues = {
  nameEn: '',
  nameKa: '',
  descriptionEn: '',
  descriptionKa: '',
  images: [],
  priceFrom: 0,
  order: 0,
  isActive: true,
};

function fromCatalog(c: CatalogRow): CatalogFormValues {
  return {
    nameEn: c.nameEn ?? '',
    nameKa: c.nameKa ?? '',
    descriptionEn: c.descriptionEn ?? '',
    descriptionKa: c.descriptionKa ?? '',
    images: c.images ?? [],
    priceFrom: c.priceFrom ?? 0,
    order: c.order ?? 0,
    isActive: c.isActive ?? true,
  };
}
```

- [ ] **Step 3: Add catalog state + handlers inside the component**

Inside `ServicesClient`, after the existing services state/handlers (e.g. after `handleSubmit`), add:

```typescript
  // ── Catalog products ──────────────────────────────────
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogRow | null>(null);
  const [catalogValues, setCatalogValues] = useState<CatalogFormValues>(EMPTY_CATALOG_FORM);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState<CatalogRow | null>(null);

  function setCat<K extends keyof CatalogFormValues>(key: K, val: CatalogFormValues[K]) {
    setCatalogValues((v) => ({ ...v, [key]: val }));
  }

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await apiFetch<{ products: CatalogRow[] }>('/api/admin/catalog');
      setCatalog(data.products);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  function openCreateCatalog() {
    setEditingCatalog(null);
    setCatalogValues({ ...EMPTY_CATALOG_FORM, order: catalog.length });
    setCatalogDialogOpen(true);
  }

  function openEditCatalog(c: CatalogRow) {
    setEditingCatalog(c);
    setCatalogValues(fromCatalog(c));
    setCatalogDialogOpen(true);
  }

  async function handleCatalogDelete() {
    if (!catalogToDelete) return;
    try {
      await apiFetch(`/api/admin/catalog/${catalogToDelete._id}`, { method: 'DELETE' });
      toast.success(`Deleted "${catalogToDelete.nameEn}"`);
      loadCatalog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete product');
    } finally {
      setCatalogToDelete(null);
    }
  }

  async function handleCatalogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catalogValues.nameEn.trim()) return toast.error('English name is required');
    if (!catalogValues.nameKa.trim()) return toast.error('Georgian name is required');

    const payload = {
      nameEn: catalogValues.nameEn.trim(),
      nameKa: catalogValues.nameKa.trim(),
      descriptionEn: catalogValues.descriptionEn,
      descriptionKa: catalogValues.descriptionKa,
      images: catalogValues.images,
      priceFrom: Number(catalogValues.priceFrom),
      order: catalogValues.order,
      isActive: catalogValues.isActive,
    };

    setSavingCatalog(true);
    try {
      if (editingCatalog) {
        await apiFetch(`/api/admin/catalog/${editingCatalog._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Product updated');
      } else {
        await apiFetch('/api/admin/catalog', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Product created');
      }
      setCatalogDialogOpen(false);
      loadCatalog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save product');
    } finally {
      setSavingCatalog(false);
    }
  }

  const catalogColumns: Column<CatalogRow>[] = [
    {
      key: 'nameEn',
      header: 'Product',
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.images[0]}
              alt=""
              className="h-9 w-9 rounded object-cover border border-border-light dark:border-border-dark"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <Package className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{c.nameEn}</div>
            <div className="text-xs text-neutral-500 truncate">{c.nameKa}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'priceFrom',
      header: 'From',
      className: 'text-neutral-500',
      render: (c) => `${c.priceFrom} ₾`,
    },
    {
      key: 'order',
      header: 'Order',
      className: 'text-neutral-500',
      render: (c) => c.order,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'default' : 'secondary'}>
          {c.isActive ? 'Active' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditCatalog(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => setCatalogToDelete(c)}>
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];
```

- [ ] **Step 4: Load catalog on mount**

Find the existing `useEffect` that calls `load()` and `loadPage()`. Add `loadCatalog()` and the dependency:

```typescript
  useEffect(() => {
    load();
    loadPage();
    loadCatalog();
  }, [load, loadPage, loadCatalog]);
```

- [ ] **Step 5: Render the catalog section + dialog**

In the returned JSX, immediately **before** the closing `</div>` of the component's root (after the services `<ConfirmDialog>`), add:

```tsx
      {/* ── Product catalog ─────────────────────────────── */}
      <section className="mt-10">
        <PageHeader
          title="Product catalog"
          description={`${catalog.length} product${catalog.length === 1 ? '' : 's'} · shown on the services page`}
        >
          <Button className="gap-1" onClick={openCreateCatalog}>
            <Plus className="h-4 w-4" /> New product
          </Button>
        </PageHeader>

        <DataTable
          columns={catalogColumns}
          rows={catalog}
          rowKey={(c) => c._id}
          loading={catalogLoading}
          emptyTitle="No catalog products yet"
          emptyDescription="Add products to show a 'starts from' catalog on the services page."
          emptyAction={
            <Button onClick={openCreateCatalog}>
              <Plus className="h-4 w-4" /> New product
            </Button>
          }
        />
      </section>

      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCatalog ? 'Edit product' : 'New product'}</DialogTitle>
            <DialogDescription>
              {editingCatalog ? editingCatalog.nameEn : 'Add a product to the services page catalog.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCatalogSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name (EN)" required>
                <Input value={catalogValues.nameEn} onChange={(e) => setCat('nameEn', e.target.value)} />
              </Field>
              <Field label="Name (KA)" required>
                <Input value={catalogValues.nameKa} onChange={(e) => setCat('nameKa', e.target.value)} />
              </Field>
            </div>

            <Field label="Description (EN)">
              <Textarea
                rows={2}
                value={catalogValues.descriptionEn}
                onChange={(e) => setCat('descriptionEn', e.target.value)}
              />
            </Field>
            <Field label="Description (KA)">
              <Textarea
                rows={2}
                value={catalogValues.descriptionKa}
                onChange={(e) => setCat('descriptionKa', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Price from (₾)" required hint="Shown as 'Starts from N ₾'">
                <Input
                  type="number"
                  min={0}
                  value={catalogValues.priceFrom}
                  onChange={(e) => setCat('priceFrom', Number(e.target.value))}
                />
              </Field>
              <Field label="Order" hint="Lower numbers appear first">
                <Input
                  type="number"
                  value={catalogValues.order}
                  onChange={(e) => setCat('order', Number(e.target.value))}
                />
              </Field>
            </div>

            <Field label="Images" hint="First image is the cover">
              <ImageUploader value={catalogValues.images} onChange={(urls) => setCat('images', urls)} />
            </Field>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-neutral-500">Visible on storefront</p>
              </div>
              <Switch checked={catalogValues.isActive} onCheckedChange={(v) => setCat('isActive', v)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatalogDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCatalog}>
                {savingCatalog && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCatalog ? 'Save changes' : 'Create product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!catalogToDelete}
        onOpenChange={(o) => !o && setCatalogToDelete(null)}
        title="Delete product?"
        description={
          catalogToDelete
            ? `"${catalogToDelete.nameEn}" will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleCatalogDelete}
      />
```

- [ ] **Step 6: Verify build + manual admin check**

Run: `npm run build`
Expected: Build succeeds.

Then `npm run dev`, open `/admin/services` as an admin:
- "Product catalog" section shows below services.
- "New product" → dialog opens; fill name EN/KA, price, upload 2 images, save.
- New row appears with cover thumbnail and `N ₾`.
- Edit changes price; delete asks to confirm and removes the row.

- [ ] **Step 7: Commit**

```bash
git add app/admin/services/ServicesClient.tsx
git commit -m "feat: admin catalog product management in services page"
```

---

### Task 6: Storefront — catalog section on services page

**Files:**
- Modify: `app/[locale]/(shop)/services/page.tsx`

**Interfaces:**
- Consumes: `getActiveCatalogProducts` + `CatalogProductView` from Task 3; `services.sectionCatalog` / `services.startsFrom` i18n keys from Task 4; existing `FALLBACK_IMAGES`, `Image`, `t`.
- Produces: a rendered catalog `<section>` between the services grid and the "How it works" process section.

- [ ] **Step 1: Load catalog data**

In `app/[locale]/(shop)/services/page.tsx`:

Update the import on line 13:

```typescript
import { getActiveServices, getServicePage, getActiveCatalogProducts } from '@/lib/services-data';
```

Update the `Promise.all` (around line 39) to also fetch catalog:

```typescript
  const [services, page, catalog] = await Promise.all([
    getActiveServices(),
    getServicePage(),
    getActiveCatalogProducts(),
  ]);
```

- [ ] **Step 2: Render the catalog section**

Insert this block immediately after the services `</section>` (the one with `id="services"`, closes around line 145) and **before** the `{/* ── Process ── */}` section:

```tsx
      {/* ── Product catalog ──────────────────────────────── */}
      {catalog.length > 0 && (
        <section className="border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-display text-ink dark:text-white">
                {t('sectionCatalog')}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((c, i) => {
                const name = isKa ? c.nameKa : c.nameEn;
                const desc = isKa ? c.descriptionKa : c.descriptionEn;
                const img = c.images[0] || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
                return (
                  <article
                    key={c._id}
                    className="group overflow-hidden rounded-3xl border border-border-light bg-paper transition-shadow hover:shadow-xl hover:shadow-ink/5 dark:border-border-dark dark:bg-ink"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={img}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-lg font-semibold text-ink dark:text-white">{name}</h3>
                      {desc && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-graphite">{desc}</p>}
                      <p className="mt-3 font-semibold text-cobalt dark:text-cobalt-dark">
                        {t('startsFrom', { price: c.priceFrom })}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
```

- [ ] **Step 3: Verify build + manual storefront check**

Run: `npm run build`
Expected: Build succeeds.

Then `npm run dev`:
- Visit `/en/services` — catalog section appears after services, before "How it works", cards show cover + name + "Starts from N ₾".
- Visit `/ka/services` — same section, price reads "იწყება N ₾-დან", names in Georgian.
- In admin, toggle a product to Hidden → it disappears from storefront; delete → gone.
- With zero active products, the section does not render at all.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(shop)/services/page.tsx"
git commit -m "feat: product catalog section on storefront services page"
```

---

## Self-Review

**Spec coverage:**
- Data model → Task 1. ✓
- Data layer loader → Task 3. ✓
- Admin API (list/create/update/delete, module 'content', reuse upload) → Task 2. ✓
- Admin UI (section in ServicesClient, multi-image ImageUploader, price number, order, active, delete confirm) → Task 5. ✓
- Storefront section between grid and process, localized "starts from", image fallback, empty→hidden → Task 6. ✓
- i18n both locales → Task 4. ✓
- Non-goals (no cart/SKU/stock/detail page/pagination) → nothing in any task introduces them. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/vague steps. All code shown in full.

**Type consistency:**
- `ICatalogProduct` fields ↔ `CatalogProductSchema` (Zod) ↔ `CatalogProductView` ↔ `CatalogRow` ↔ `CatalogFormValues` — all use `nameEn, nameKa, descriptionEn, descriptionKa, images, priceFrom, order, isActive`. ✓
- API returns `{ products }` (Task 2 GET) ↔ client reads `data.products` (Task 5 loadCatalog). ✓
- `getActiveCatalogProducts` return type `CatalogProductView[]` ↔ storefront `catalog.map` fields (`nameKa`, `descriptionKa`, `images[0]`, `priceFrom`). ✓
- i18n `startsFrom` uses `{price}` ↔ storefront calls `t('startsFrom', { price: c.priceFrom })`. ✓
- `logActivity(session, action, entityType, entityId, meta)` matches usage in Task 2 (action is a free string — `catalog.*`). ✓
```
