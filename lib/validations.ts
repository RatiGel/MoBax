import { z } from 'zod';
import { slugify } from '@/lib/utils';

/**
 * A slug field that normalizes whatever the admin typed instead of trusting it.
 *
 * The storefront resolves /products/[slug] by exact match, so an unnormalized
 * value ("IPhone 16 Pro Max Case") is a guaranteed 404. Normalizing in the
 * schema means every route that parses through it — create, update, and any
 * future caller — gets URL-safe slugs, rather than each one remembering to call
 * slugify. A value that normalizes to empty is rejected so it can never be
 * written; callers that omit the slug entirely fall back to slugify(nameEn).
 */
const slugField = z
  .string()
  .max(120)
  .transform((s) => slugify(s))
  .refine((s) => s.length > 0, 'Slug must contain at least one letter or number');

// Zod's `.partial()` makes every key optional but does NOT remove `.default(...)`
// — an omitted key still gets its default filled in on parse. For a PATCH-style
// update schema derived from a create schema, that silently reintroduces the
// defaulted fields (e.g. `descriptionEn: ''`, `tags: []`, `isActive: true`) into
// the parsed result even though the caller never sent them, and the route then
// `$set`s the whole parsed object — wiping real data with defaults.
//
// This helper builds an update schema that keeps every constraint (`.max()`,
// `.url()`, enum membership, nested object/array shapes, etc.) but drops the
// `.default(...)` wrapper first, then applies `.partial()`. The result: an
// omitted key stays omitted in the parsed output, while a present key is still
// validated exactly as it would be on create.
function toUpdateSchema<Shape extends z.ZodRawShape>(createSchema: z.ZodObject<Shape>) {
  const shape = createSchema.shape;
  const unwrapped = Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [
      key,
      schema instanceof z.ZodDefault ? schema.removeDefault() : schema,
    ])
  ) as Shape;
  return z.object(unwrapped).partial();
}

export const RegisterSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const OrderAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  // Town/village name — required only when city is "other" (see CreateOrderSchema).
  regionName: z.string().default(''),
  // National ID or passport number — required for delivery/customs & invoicing.
  idNumber: z.string().min(1),
  country: z.string().min(1),
});

// Profile saved address — same shape as OrderAddressSchema minus email.
// Optional fields use .default('') so a partially-filled address still saves.
export const ProfileAddressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  regionName: z.string().default(''),
  idNumber: z.string().default(''),
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

export const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  address: OrderAddressSchema,
  guestEmail: z.string().email().optional(),
  paymentMethod: z.enum(['FLITT']).default('FLITT'),
  deliveryMethod: z.enum(['pickup', 'instant', 'nextday', 'regional']),
}).superRefine((data, ctx) => {
  // "Other region" has no fixed town in the dropdown — require the buyer to name
  // it so the courier can actually deliver. Only matters for regional delivery.
  if (data.deliveryMethod === 'regional' && data.address.city === 'other' && !data.address.regionName.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address', 'regionName'],
      message: 'Enter your town or village',
    });
  }
});

const ProductVariantSchema = z.object({
  color: z.string().optional(),
  modelCompat: z.string().optional(),
  size: z.string().optional(),
});

export const CreateProductSchema = z.object({
  slug: slugField.optional(), // auto-derived from nameEn if omitted
  nameEn: z.string().min(1, 'English name is required').max(160),
  nameKa: z.string().min(1, 'Georgian name is required').max(160),
  descriptionEn: z.string().max(5000).default(''),
  descriptionKa: z.string().max(5000).default(''),
  price: z.number().nonnegative('Price must be ≥ 0'),
  originalPrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
  salePriceStart: z.coerce.date().optional(),
  salePriceEnd: z.coerce.date().optional(),
  sku: z.string().min(1, 'SKU is required').max(64),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  categorySlug: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  tags: z.array(z.string()).default([]),
  variants: z.array(ProductVariantSchema).default([]),
  images: z.array(z.string().url('Each image must be a valid URL')).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNewProduct: z.boolean().default(false),
  specs: z.record(z.string(), z.string()).default({}),
});

// All fields optional on update; same constraints when present. Defaults are
// create-only (see toUpdateSchema) so an omitted field is left untouched
// rather than overwritten with its default.
export const UpdateProductSchema = toUpdateSchema(CreateProductSchema);

// --- Inventory admin ---

export const InventoryAdjustReasonSchema = z.enum(['restock', 'damage', 'correction', 'return']);

export const InventoryAdjustSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  delta: z.number().int().refine((d) => d !== 0, 'Delta must not be zero'),
  reason: InventoryAdjustReasonSchema,
  note: z.string().max(500).optional(),
});

export type InventoryAdjustInput = z.infer<typeof InventoryAdjustSchema>;

export const CreateCategorySchema = z.object({
  slug: slugField.optional(), // auto-derived from nameEn if omitted
  nameEn: z.string().min(1, 'English name is required').max(160),
  nameKa: z.string().min(1, 'Georgian name is required').max(160),
  descriptionEn: z.string().max(5000).default(''),
  descriptionKa: z.string().max(5000).default(''),
  icon: z.string().max(120).default(''),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).default(''),
  parentSlug: z.string().max(120).nullable().optional(),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present. Defaults are
// create-only (see toUpdateSchema).
export const UpdateCategorySchema = toUpdateSchema(CreateCategorySchema);

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  trackingNumber: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

// --- Reviews ---

export const ReviewSchema = z.object({
  productSlug: z.string().min(1, 'Product is required').max(160),
  rating: z.coerce.number().int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
  title: z.string().min(1, 'Title is required').max(160),
  body: z.string().min(1, 'Review text is required').max(5000),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

export const CreateBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(120),
  logoUrl: z.string().url('Logo must be a valid URL').or(z.literal('')).default(''),
  type: z.enum(['device', 'maker']).default('maker'),
  compatTerms: z.array(z.string()).default([]),
});

// Defaults are create-only (see toUpdateSchema) so update never overwrites
// logoUrl/type/compatTerms with their defaults when omitted.
export const UpdateBrandSchema = toUpdateSchema(CreateBrandSchema);

// --- Pricing & Promotions admin ---

export const DiscountTypeSchema = z.enum(['percentage', 'fixed']);

export const CreateDiscountSchema = z.object({
  code: z.string().min(1, 'Code is required').max(64).transform((c) => c.trim().toUpperCase()),
  type: DiscountTypeSchema,
  value: z.coerce.number().nonnegative('Value must be ≥ 0'),
  minOrderAmount: z.coerce.number().nonnegative().default(0),
  usageLimit: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  // applicableProducts / applicableCategories are not exposed in the admin form yet —
  // they default to empty arrays. Add UI for them in a later iteration.
  applicableProducts: z.array(z.string()).default([]),
  applicableCategories: z.array(z.string()).default([]),
});

// All fields optional on update; code is still uppercased when present.
// Defaults are create-only (see toUpdateSchema).
export const UpdateDiscountSchema = toUpdateSchema(CreateDiscountSchema);

export const CreatePromotionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  buyProductSlug: z.string().min(1, 'Buy product is required'),
  buyQty: z.coerce.number().int().positive().default(1),
  getProductSlug: z.string().min(1, 'Get product is required'),
  discountPercent: z.coerce.number().min(0).max(100),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present. Defaults are
// create-only (see toUpdateSchema).
export const UpdatePromotionSchema = toUpdateSchema(CreatePromotionSchema);

export type CreateDiscountInput = z.infer<typeof CreateDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof UpdateDiscountSchema>;
export type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof UpdatePromotionSchema>;

// --- Content (Pages / CMS) admin ---

const PAGE_KEYS = ['home', 'about', 'faq', 'contact', 'privacy', 'terms'] as const;
const SECTION_TYPES = ['hero', 'text', 'banner', 'faq', 'grid'] as const;

export const PageKeySchema = z.enum(PAGE_KEYS);

const PageSectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  content: z.unknown().default({}),
  isVisible: z.boolean().default(true),
  order: z.number().int().default(0),
});

// PUT body for a page. pageKey comes from the route param, not the body.
export const UpdatePageSchema = z.object({
  sections: z.array(PageSectionSchema).default([]),
  seo: z
    .object({
      title: z.string().max(200).default(''),
      description: z.string().max(500).default(''),
    })
    .default({ title: '', description: '' }),
});

export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;

// --- Settings admin ---

// Settings values are arbitrary JSON blobs keyed by SETTING_KEYS. The map is
// validated loosely; per-key shape is enforced by the UI, not the API.
export const UpdateSettingsSchema = z
  .record(z.string(), z.unknown())
  .refine((m) => Object.keys(m).length > 0, 'No settings to update');

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

// FAQ items stored under the `faq` setting key. Bilingual; array order is
// display order. Validated explicitly on write (see admin/settings route)
// even though the settings map itself is loose.
export const FaqItemSchema = z.object({
  id: z.string().min(1),
  questionEn: z.string().min(1, 'English question is required').max(300),
  questionKa: z.string().min(1, 'Georgian question is required').max(300),
  answerEn: z.string().min(1, 'English answer is required').max(2000),
  answerKa: z.string().min(1, 'Georgian answer is required').max(2000),
});

export const FaqItemsSchema = z.array(FaqItemSchema).max(50);

export type FaqItem = z.infer<typeof FaqItemSchema>;

// Nav links stored under the `nav` setting key, rendered by Navbar after the
// built-in Services link. Href is required but not shape-restricted — it may
// be a relative storefront path or an absolute URL.
export const NavLinkSchema = z.object({
  labelEn: z.string().min(1, 'English label is required').max(60),
  labelKa: z.string().max(60).default(''),
  href: z.string().min(1, 'Link URL is required').max(500),
});

export const NavSettingsSchema = z.object({
  links: z.array(NavLinkSchema).max(20),
});

// Footer columns/social/contact stored under the `footer` setting key.
// Footer renders these when present and falls back to its hardcoded content
// per-field when empty — see components/layout/Footer.tsx.
export const FooterColumnSchema = z.object({
  titleEn: z.string().min(1, 'English title is required').max(60),
  titleKa: z.string().max(60).default(''),
  links: z.array(NavLinkSchema).max(20),
});

export const FooterSettingsSchema = z.object({
  columns: z.array(FooterColumnSchema).max(10),
  social: z
    .array(
      z.object({
        platform: z.string().min(1).max(40),
        url: z.string().min(1).max(500),
      })
    )
    .max(10),
  contact: z.object({
    phone: z.string().max(40).default(''),
    email: z.string().max(200).default(''),
    addressEn: z.string().max(300).default(''),
    addressKa: z.string().max(300).default(''),
  }),
});

// Typography stored under the `typography` setting key. Only Inter and Space
// Grotesk are actually loaded by this app (see lib/theme.ts) — the enum is
// deliberately narrower than fonts that were once considered but never
// wired into app/globals.css. `scale` is clamped again server-side in
// lib/theme.ts regardless of what passes validation here, since the admin
// form is not the only possible writer to the Setting document.
export const TypographySchema = z.object({
  displayFont: z.enum(['Inter', 'Space Grotesk']),
  bodyFont: z.enum(['Inter', 'System']),
  scale: z.number().min(0.9).max(1.15),
});

// --- Team / Customers admin ---

const AdminRoleEnum = z.enum(['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR']);

export const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: AdminRoleEnum,
});

export const UpdateRoleSchema = z.object({
  role: AdminRoleEnum,
});

export const UpdateCustomerSchema = z.object({
  isBlocked: z.boolean(),
});

export type InviteInput = z.infer<typeof InviteSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

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

// All fields optional on update, same constraints when present. Defaults are
// create-only (see toUpdateSchema) so an omitted field is left untouched
// rather than overwritten with a default.
export const UpdateServiceSchema = toUpdateSchema(CreateServiceSchema);

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

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

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

// All fields optional on update, same constraints when present. Defaults are
// create-only (see toUpdateSchema).
export const UpdateCatalogProductSchema = toUpdateSchema(CreateCatalogProductSchema);

export type CreateCatalogProductInput = z.infer<typeof CreateCatalogProductSchema>;
export type UpdateCatalogProductInput = z.infer<typeof UpdateCatalogProductSchema>;
