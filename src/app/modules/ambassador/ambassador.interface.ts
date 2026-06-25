import { Types } from 'mongoose';

export interface IAmbassador {
  userId: Types.ObjectId;
  ambassadorId: string;
  referralCode: string;
  assignedCity: string;
  assignedCountry: string;
  languages?: string[];
  commissionRate: number;
  commissionType: 'percentage' | 'fixed';
  commissionBase: 'platform_fee';
  commissionDuration: 'lifetime' | '6_months' | '12_months';
  commissionStartDate: Date;
  commissionEndDate?: Date;
  status: 'active' | 'paused' | 'removed' | 'pending';
  phone?: string;
  whatsapp?: string;
  paymentMethod?: string;
  internalNotes?: string;
}

export interface IAmbassadorCommission {
  ambassadorId: Types.ObjectId;
  providerId: Types.ObjectId;
  bookingId: Types.ObjectId;
  paymentId?: Types.ObjectId;
  bookingAmount: number;
  platformFee: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'eligible' | 'paid' | 'cancelled';
  paidDate?: Date;
  paidAmount?: number;
  payoutMethod?: string;
}
