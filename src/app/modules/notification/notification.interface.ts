import { Types } from 'mongoose';

export interface INotification {
  recipient: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  bookingId?: Types.ObjectId;
  read?: boolean;
}
