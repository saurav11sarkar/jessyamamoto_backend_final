<<<<<<< HEAD
import { Types } from 'mongoose';

export interface INotification {
  recipient: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  bookingId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  messageId?: Types.ObjectId;
  read?: boolean;
}
=======
import { Types } from 'mongoose';

export interface INotification {
  recipient: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  bookingId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  messageId?: Types.ObjectId;
  read?: boolean;
}
>>>>>>> d4f74793a1be02d33ff71626557e08c2d4b58f9e
