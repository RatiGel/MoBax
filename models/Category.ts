import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  slug: string;
  nameEn: string;
  nameKa: string;
  icon: string;
  image: string;
  parentSlug?: string;
  productCount: number;
}

const CategorySchema = new Schema<ICategory>({
  slug: { type: String, required: true, unique: true },
  nameEn: { type: String, required: true },
  nameKa: { type: String, required: true },
  icon: { type: String, default: '' },
  image: { type: String, default: '' },
  parentSlug: { type: String, default: null },
  productCount: { type: Number, default: 0 },
});

const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
