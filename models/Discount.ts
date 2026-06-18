import mongoose, { Schema, Document, Model } from 'mongoose';

export type DiscountType = 'percentage' | 'fixed';

export interface IDiscount extends Document {
  code: string;
  type: DiscountType;
  value: number;
  minOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: Date;
  isActive: boolean;
  applicableProducts: string[];
  applicableCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    applicableProducts: [{ type: String }],
    applicableCategories: [{ type: String }],
  },
  { timestamps: true }
);

DiscountSchema.index({ isActive: 1 });

const Discount: Model<IDiscount> =
  (mongoose.models.Discount as Model<IDiscount>) ||
  mongoose.model<IDiscount>('Discount', DiscountSchema);

export default Discount;
