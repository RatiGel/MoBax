import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  icon: string;
  image: string;
  parentSlug?: string;
  isActive: boolean;
  productCount: number;
}

const CategorySchema = new Schema<ICategory>({
  slug: { type: String, required: true, unique: true },
  nameEn: { type: String, required: true },
  nameKa: { type: String, required: true },
  descriptionEn: { type: String, default: '' },
  descriptionKa: { type: String, default: '' },
  icon: { type: String, default: '' },
  image: { type: String, default: '' },
  parentSlug: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  productCount: { type: Number, default: 0 },
});

const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
