import mongoose, { Schema, Document, Model } from 'mongoose';

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

export interface IOrder extends Document {
  userId?: string;
  guestEmail?: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  addressSnapshot: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    zipCode: string;
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
    userId: { type: String },
    guestEmail: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
      default: 'PENDING',
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    addressSnapshot: {
      firstName: String,
      lastName: String,
      address: String,
      city: String,
      zipCode: String,
      country: String,
      phone: String,
    },
    items: [OrderItemSchema],
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
