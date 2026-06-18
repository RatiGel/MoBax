import mongoose, { Schema, Document, Model } from 'mongoose';
import type { UserRole } from './User';

export interface IInvite extends Document {
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'],
      required: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Invite: Model<IInvite> =
  (mongoose.models.Invite as Model<IInvite>) ||
  mongoose.model<IInvite>('Invite', InviteSchema);

export default Invite;
