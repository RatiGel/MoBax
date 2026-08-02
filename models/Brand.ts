import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand extends Document {
  slug: string;
  name: string;
  /** device = phone maker (matches by compatibility too); maker = accessory brand. */
  type: 'device' | 'maker';
  /** Extra terms (besides `name`) matched against specs.Compatibility. */
  compatTerms: string[];
  logoUrl?: string;
  order: number;
}

const BrandSchema = new Schema<IBrand>({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['device', 'maker'], default: 'maker' },
  compatTerms: [{ type: String }],
  logoUrl: { type: String, default: '' },
  order: { type: Number, default: 0 },
});

const Brand: Model<IBrand> =
  (mongoose.models.Brand as Model<IBrand>) || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
