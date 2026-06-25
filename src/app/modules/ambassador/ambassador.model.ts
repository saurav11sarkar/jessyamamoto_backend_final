import mongoose from 'mongoose';
import { IAmbassador, IAmbassadorCommission } from './ambassador.interface';

const AmbassadorSchema = new mongoose.Schema<IAmbassador>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ambassadorId: { type: String, required: true, unique: true },
    referralCode: { type: String, required: true, unique: true },
    assignedCity: { type: String, required: true },
    assignedCountry: { type: String, required: true },
    languages: [{ type: String }],
    commissionRate: { type: Number, required: true, default: 10 },
    commissionType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    commissionBase: { type: String, default: 'platform_fee' },
    commissionDuration: { type: String, enum: ['lifetime', '6_months', '12_months'], default: '12_months' },
    commissionStartDate: { type: Date, default: Date.now },
    commissionEndDate: { type: Date },
    status: { type: String, enum: ['active', 'paused', 'removed', 'pending'], default: 'pending' },
    phone: { type: String },
    whatsapp: { type: String },
    paymentMethod: { type: String },
    internalNotes: { type: String },
  },
  { timestamps: true },
);

const AmbassadorCommissionSchema = new mongoose.Schema<IAmbassadorCommission>(
  {
    ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    bookingAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'eligible', 'paid', 'cancelled'], default: 'pending' },
    paidDate: { type: Date },
    paidAmount: { type: Number },
    payoutMethod: { type: String },
  },
  { timestamps: true },
);

export const Ambassador = mongoose.model('Ambassador', AmbassadorSchema);
export const AmbassadorCommission = mongoose.model('AmbassadorCommission', AmbassadorCommissionSchema);
