import mongoose, { Schema, Document, Model } from 'mongoose';

/** MB-<base36 ms>-<4 random base36>. Unique enough for order numbers. */
function genOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `MB-${ts}-${rand}`;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface IOrderItem {
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  image: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IOrder extends Document {
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /**
   * Set the moment one request wins the atomic claim to send the paid-order
   * notifications. Deliberately separate from `paymentStatus` — the webhook and
   * the browser-return handler both mark an order PAID, so status cannot double
   * as "already notified" without one path silently swallowing the emails.
   */
  paidNotifiedAt?: Date;
  paymentMethod: string;
  trackingNumber?: string;
  notes?: string;
  subtotal: number;
  shippingCost: number;
  deliveryMethod: 'pickup' | 'instant' | 'nextday' | 'regional';
  total: number;
  addressSnapshot: {
    firstName: string;
    lastName: string;
    email?: string;
    address: string;
    city: string;
    regionName?: string;
    idNumber: string;
    country: string;
    phone: string;
  };
  items: IOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true, default: genOrderNumber },
    userId: { type: String },
    guestEmail: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    paidNotifiedAt: { type: Date },
    paymentMethod: { type: String, default: 'COD' },
    trackingNumber: { type: String },
    notes: { type: String },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'instant', 'nextday', 'regional'],
      default: 'pickup',
    },
    total: { type: Number, required: true },
    addressSnapshot: {
      firstName: String,
      lastName: String,
      email: String,
      address: String,
      city: String,
      regionName: String,
      idNumber: String,
      country: String,
      phone: String,
    },
    items: [OrderItemSchema],
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ userId: 1 });

const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
