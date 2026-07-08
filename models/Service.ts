import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    titleEn: { type: String, required: true, trim: true },
    titleKa: { type: String, required: true, trim: true },
    descriptionEn: { type: String, default: '' },
    descriptionKa: { type: String, default: '' },
    image: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service: Model<IService> =
  (mongoose.models.Service as Model<IService>) || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
