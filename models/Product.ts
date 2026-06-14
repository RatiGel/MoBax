import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  price: number;
  originalPrice?: number;
  sku: string;
  stock: number;
  categorySlug: string;
  brand: string;
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
    slug: { type: String, required: true, unique: true },
    nameEn: { type: String, required: true },
    nameKa: { type: String, required: true },
    descriptionEn: { type: String, default: '' },
    descriptionKa: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, default: 0 },
    categorySlug: { type: String, required: true },
    brand: { type: String, required: true },
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

const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
