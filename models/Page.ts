import mongoose, { Schema, Document, Model } from 'mongoose';

export type PageKey = 'home' | 'about' | 'faq' | 'contact' | 'privacy' | 'terms';
export type SectionType = 'hero' | 'text' | 'banner' | 'faq' | 'grid';

export interface IPageSection {
  type: SectionType;
  content: unknown; // JSON blob, shape depends on type
  isVisible: boolean;
  order: number;
}

export interface IPage extends Document {
  pageKey: PageKey;
  sections: IPageSection[];
  seo: { title: string; description: string };
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<IPageSection>(
  {
    type: { type: String, enum: ['hero', 'text', 'banner', 'faq', 'grid'], required: true },
    content: { type: Schema.Types.Mixed, default: {} },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const PageSchema = new Schema<IPage>(
  {
    pageKey: {
      type: String,
      enum: ['home', 'about', 'faq', 'contact', 'privacy', 'terms'],
      required: true,
      unique: true,
    },
    sections: [SectionSchema],
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const Page: Model<IPage> =
  (mongoose.models.Page as Model<IPage>) || mongoose.model<IPage>('Page', PageSchema);

export default Page;
