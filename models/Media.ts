import mongoose, { Schema, Document, Model } from 'mongoose';
import { MEDIA_FOLDERS, type MediaFolder } from '@/lib/media-folders';

// Re-exported for existing importers (several API routes import these names
// from this model). Canonical definitions live in lib/media-folders.ts.
export { MEDIA_FOLDERS, type MediaFolder };

export interface IMedia extends Document {
  url: string;
  publicId: string;
  folder: MediaFolder;
  width: number;
  height: number;
  bytes: number;
  format: string;
  alt: string;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    folder: { type: String, enum: MEDIA_FOLDERS, default: 'products' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    format: { type: String, default: '' },
    alt: { type: String, default: '', maxlength: 500 },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ alt: 'text' });

const Media: Model<IMedia> =
  (mongoose.models.Media as Model<IMedia>) || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;
