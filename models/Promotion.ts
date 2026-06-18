import mongoose, { Schema, Document, Model } from 'mongoose';

/** Bundle deal: buy `buyProductSlug` (qty buyQty) get `getProductSlug` at `discountPercent` off. */
export interface IPromotion extends Document {
  name: string;
  buyProductSlug: string;
  buyQty: number;
  getProductSlug: string;
  discountPercent: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true },
    buyProductSlug: { type: String, required: true },
    buyQty: { type: Number, default: 1, min: 1 },
    getProductSlug: { type: String, required: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const Promotion: Model<IPromotion> =
  (mongoose.models.Promotion as Model<IPromotion>) ||
  mongoose.model<IPromotion>('Promotion', PromotionSchema);

export default Promotion;
