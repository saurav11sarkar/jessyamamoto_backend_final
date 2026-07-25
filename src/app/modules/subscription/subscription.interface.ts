import { Types } from 'mongoose';

export interface ISubscription {
  type: string;
  title: string;
  price: number;
  bookingFeePercent?: number;
  bookingFeeMinimum?: number;
  description: string;
  content: string;
  totalSubscripeUser?: Types.ObjectId[] | undefined;
  totalServices?: Types.ObjectId[] | undefined;
}
