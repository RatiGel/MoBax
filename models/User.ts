import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'STORE_MANAGER'
  | 'CONTENT_EDITOR'
  | 'CUSTOMER';

export const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

export interface IUserAddress {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  regionName?: string;
  idNumber?: string;
  country: string;
}

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isBlocked: boolean;
  googleId?: string;
  image?: string;
  address?: IUserAddress;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR', 'CUSTOMER'],
      default: 'CUSTOMER',
    },
    isBlocked: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true },
    image: { type: String },
    address: {
      type: {
        firstName: String,
        lastName: String,
        phone: String,
        address: String,
        city: String,
        regionName: String,
        idNumber: String,
        country: String,
      },
      required: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;
