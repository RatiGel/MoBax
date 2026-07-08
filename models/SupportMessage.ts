import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SupportSenderRole = 'customer' | 'staff';

export interface ISupportMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: SupportSenderRole;
  body: string;
  createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['customer', 'staff'], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Thread reads fetch a conversation's messages in chronological order.
SupportMessageSchema.index({ conversationId: 1, createdAt: 1 });

const SupportMessage: Model<ISupportMessage> =
  (mongoose.models.SupportMessage as Model<ISupportMessage>) ||
  mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);

export default SupportMessage;
