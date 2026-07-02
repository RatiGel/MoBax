import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type ConversationStatus = 'open' | 'closed';

export interface IConversation extends Document {
  userId: Types.ObjectId;
  status: ConversationStatus;
  lastMessageAt: Date;
  /** Short preview of the newest message for the admin list (first 120 chars). */
  lastMessageBody: string;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    // One support thread per customer — reopened rather than duplicated.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageBody: { type: String, default: '' },
    unreadByAdmin: { type: Number, default: 0 },
    unreadByUser: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Admin inbox sorts by recency.
ConversationSchema.index({ lastMessageAt: -1 });

const Conversation: Model<IConversation> =
  (mongoose.models.Conversation as Model<IConversation>) ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
