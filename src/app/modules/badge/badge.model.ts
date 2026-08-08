import mongoose, { Schema } from 'mongoose';

export const userBadgeSchema = new Schema(
  {
    badge: { type: Schema.Types.ObjectId, ref: 'Badge', required: true },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: true },
    validThrough: { type: Date },
    note: { type: String },
    awardedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
  },
  { _id: false },
);

const badgeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    issuer: { type: String, default: 'JetSet Cares' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Badge = mongoose.model('Badge', badgeSchema);
export default Badge;
