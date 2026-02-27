import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';

const orderSchema = new Schema<IOrder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, default: 10 },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online'],
    default: 'cod',
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending' 
  },
  riderStatus: {
    type: String,
    enum: ['Assigned', 'Accepted', 'Picked', 'OutForDelivery', 'Delivered', 'Rejected'],
    default: null,
  },
  rejectedByRiderIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  assignedRiderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  etaMinutes: { type: Number, default: null },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);
