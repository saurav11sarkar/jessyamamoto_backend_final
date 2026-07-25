import { Types } from 'mongoose';

export interface IBooking {
  userId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
  day?: string;
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  status?:
    | 'draft'
    | 'pending'
    | 'confirmed'
    | 'accepted'
    | 'completed'
    | 'declined'
    | 'cancelled'
    | 'refunded';
  bookingMode?: 'request' | 'instant';
  location?: string;
  hotelName?: string;
  childCount?: number;
  childAges?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  medicalNotes?: string;
  instructions?: string;
  timezone?: string;
  holdExpiresAt?: Date;
  pricingSnapshot?: {
    hourlyRate: number;
    durationHours: number;
    serviceSubtotal: number;
    bookingFeePercent: number;
    bookingFeeMinimum: number;
    trustedBookingFee: number;
    currency: string;
    membershipType: string;
    membershipPrice: number;
    payNowTotal: number;
    payPartnerLater: number;
  };
}
