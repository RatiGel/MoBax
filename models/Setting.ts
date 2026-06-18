import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Generic key-value store for singletons: theme, shipping rules, tax rates,
 * store info, notification-email recipients, etc. `value` is an arbitrary blob.
 */
export interface ISetting extends Document {
  key: string;
  value: unknown;
  updatedAt: Date;
  createdAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Setting: Model<ISetting> =
  (mongoose.models.Setting as Model<ISetting>) ||
  mongoose.model<ISetting>('Setting', SettingSchema);

export default Setting;

// Known setting keys (documented constants, not enforced)
export const SETTING_KEYS = {
  THEME: 'theme',
  THEME_DRAFT: 'theme_draft',
  SHIPPING: 'shipping',
  TAX: 'tax',
  STORE_INFO: 'store_info',
  NOTIFICATIONS: 'notifications',
} as const;
