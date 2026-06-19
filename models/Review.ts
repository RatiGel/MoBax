import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  productSlug: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productSlug: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isApproved: { type: Boolean, default: false },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Public reads always filter on (productSlug, isApproved); moderation lists by isApproved.
ReviewSchema.index({ productSlug: 1, isApproved: 1 });
ReviewSchema.index({ isApproved: 1, createdAt: -1 });

const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview>) ||
  mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
