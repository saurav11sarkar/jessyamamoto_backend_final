import mongoose from 'mongoose';
import { ISubscription } from './subscription.interface';

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    type: { type: String, unique: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    bookingFeePercent: { type: Number, default: 8.88 },
    bookingFeeMinimum: { type: Number, default: 1.25 },
    description: { type: String, required: true },
    content: { type: String, required: true },
    totalSubscripeUser: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  },
  { timestamps: true },
);

const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);

export default Subscription;
