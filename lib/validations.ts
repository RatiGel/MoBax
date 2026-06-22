import { z } from 'zod';

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
  zipCode: z.string().default(''),
  country: z.string().min(1),
});

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
});

const ProductVariantSchema = z.object({
  color: z.string().optional(),
  modelCompat: z.string().optional(),
  size: z.string().optional(),
});

export const CreateProductSchema = z.object({
  slug: z.string().min(1).max(120).optional(), // auto-derived from nameEn if omitted
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

// All fields optional on update; same constraints when present.
export const UpdateProductSchema = CreateProductSchema.partial();

export const CreateCategorySchema = z.object({
  slug: z.string().min(1).max(120).optional(), // auto-derived from nameEn if omitted
  nameEn: z.string().min(1, 'English name is required').max(160),
  nameKa: z.string().min(1, 'Georgian name is required').max(160),
  descriptionEn: z.string().max(5000).default(''),
  descriptionKa: z.string().max(5000).default(''),
  icon: z.string().max(120).default(''),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).default(''),
  parentSlug: z.string().max(120).nullable().optional(),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present.
export const UpdateCategorySchema = CreateCategorySchema.partial();

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
});

export const UpdateBrandSchema = CreateBrandSchema.partial();

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
export const UpdateDiscountSchema = CreateDiscountSchema.partial();

export const CreatePromotionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  buyProductSlug: z.string().min(1, 'Buy product is required'),
  buyQty: z.coerce.number().int().positive().default(1),
  getProductSlug: z.string().min(1, 'Get product is required'),
  discountPercent: z.coerce.number().min(0).max(100),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

// All fields optional on update; same constraints when present.
export const UpdatePromotionSchema = CreatePromotionSchema.partial();

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

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
