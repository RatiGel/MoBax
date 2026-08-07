import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Default low-stock threshold for products that don't specify their own.
 * Shared between the schema default (new documents) and any query that
 * needs to treat a missing `lowStockThreshold` the same way (e.g. via
 * `$ifNull`) — most existing documents predate this field and will never
 * have it set unless backfilled, so queries must not assume its presence.
 */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export interface IProductVariant {
  color?: string;
  modelCompat?: string;
  size?: string;
}

export interface IProduct extends Document<string> {
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  salePriceStart?: Date;
  salePriceEnd?: Date;
  sku: string;
  stock: number;
  /** Below or equal to this, the product shows in the inventory low-stock list. */
  lowStockThreshold: number;
  categorySlug: string;
  brand: string;
  tags: string[];
  variants: IProductVariant[];
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNewProduct: boolean;
  rating: number;
  reviewCount: number;
  specs: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    // String _id so seeded products keep their stable catalog id (e.g. "p1").
    // The storefront/cart reference products by this id; orders store it verbatim.
    //
    // The default matters: declaring `_id` as a String replaces Mongoose's
    // automatic ObjectId, and without a default nothing fills it in, so every
    // create that didn't pass an explicit id (i.e. every product added through
    // the admin panel) failed with "document must have an _id before saving".
    // Seeding was unaffected because scripts/seed.ts supplies "p1", "p2", ….
    // A fresh ObjectId hex keeps new ids unique and URL-safe while leaving the
    // existing short seeded ids untouched.
    _id: { type: String, default: () => new Types.ObjectId().toHexString() },
    slug: { type: String, required: true, unique: true },
    nameEn: { type: String, required: true },
    nameKa: { type: String, required: true },
    descriptionEn: { type: String, default: '' },
    descriptionKa: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    salePrice: { type: Number },
    salePriceStart: { type: Date },
    salePriceEnd: { type: Date },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: DEFAULT_LOW_STOCK_THRESHOLD },
    categorySlug: { type: String, required: true },
    brand: { type: String, required: true },
    tags: [{ type: String }],
    variants: [
      new Schema<IProductVariant>(
        {
          color: { type: String },
          modelCompat: { type: String },
          size: { type: String },
        },
        { _id: false }
      ),
    ],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isNewProduct: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    specs: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

ProductSchema.index({ categorySlug: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ stock: 1 });
ProductSchema.index({ tags: 1 });

const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
