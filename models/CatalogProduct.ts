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
