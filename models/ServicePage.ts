import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IServicePage extends Document {
  key: 'services';
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServicePageSchema = new Schema<IServicePage>(
  {
    key: { type: String, enum: ['services'], required: true, unique: true, default: 'services' },
    headingEn: { type: String, default: '' },
    headingKa: { type: String, default: '' },
    introEn: { type: String, default: '' },
    introKa: { type: String, default: '' },
    mapEmbedUrl: { type: String, default: '' },
    addressEn: { type: String, default: '' },
    addressKa: { type: String, default: '' },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const ServicePage: Model<IServicePage> =
  (mongoose.models.ServicePage as Model<IServicePage>) ||
  mongoose.model<IServicePage>('ServicePage', ServicePageSchema);

export default ServicePage;
