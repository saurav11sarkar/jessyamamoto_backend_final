import { Types } from 'mongoose';

export interface ICategory {
  image?: string;
  name: string;
  description?: string;
  banner?: string[];
  isActive?: boolean;
  order?: number;
  findCareUser?: Types.ObjectId[];
  findJobUser?: Types.ObjectId[];
  bookingFeePercent?: number;
  bookingFeeMinimum?: number;
}
