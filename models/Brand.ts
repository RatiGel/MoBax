import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  logoUrl?: string;
}

const BrandSchema = new Schema<IBrand>({
  name: { type: String, required: true, unique: true },
  logoUrl: { type: String, default: '' },
});

const Brand: Model<IBrand> =
  (mongoose.models.Brand as Model<IBrand>) || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
