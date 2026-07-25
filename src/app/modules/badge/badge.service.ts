import mongoose from 'mongoose';
import AppError from '../../error/appError';
import Badge from './badge.model';
import User from '../user/user.model';

const DEFAULT_BADGES = [
  ['id_verified', 'ID Verified', 'Identity document reviewed by JetSet Cares.'],
  ['background_checked', 'Background Checked', 'Background check or equivalent screening reviewed where available.'],
  ['cpr_certified', 'CPR Certified', 'Current CPR training or certificate reviewed.'],
  ['first_aid', 'First Aid', 'First aid training or certificate reviewed.'],
  ['infant_care', 'Infant Care', 'Experienced caring for infants.'],
  ['toddler_care', 'Toddler Care', 'Experienced caring for toddlers.'],
  ['special_needs', 'Special Needs Care', 'Experience supporting children with additional needs.'],
  ['hotel_babysitting', 'Hotel Babysitting', 'Experienced supporting families in hotel settings.'],
  ['overnight_care', 'Overnight Care', 'Available for approved overnight care.'],
  ['travel_family_support', 'Travel Family Support', 'Experienced supporting traveling families.'],
  ['pet_care', 'Pet Care', 'Available for pet care support.'],
  ['home_help', 'Home Help', 'Available for approved home support.'],
  ['tutoring', 'Tutoring', 'Available for tutoring support where permitted.'],
  ['language_support', 'Language Support', 'Offers multilingual family support.'],
  ['lgbtq_affirming', 'LGBTQ+ Affirming', 'Committed to respectful, affirming care.'],
  ['jetset_academy', 'JetSet Academy', 'Completed JetSet Academy training.'],
  ['safety_training', 'Safety Training', 'Completed safety training review.'],
  ['newborn_experience', 'Newborn Experience', 'Experienced with newborn routines.'],
  ['meal_prep', 'Meal Prep', 'Comfortable helping with simple child meals.'],
  ['homework_help', 'Homework Help', 'Can support children with homework.'],
  ['swim_supervision', 'Swim Supervision', 'Can supervise water-adjacent activities when authorized.'],
  ['driving_available', 'Driving Available', 'Can provide transportation only when approved and lawful.'],
  ['top_rated', 'Top Rated', 'Consistently strong family feedback.'],
];

const seedDefaults = async () => {
  const results = [];
  for (let i = 0; i < DEFAULT_BADGES.length; i += 1) {
    const [key, title, description] = DEFAULT_BADGES[i]!;
    results.push(
      await Badge.findOneAndUpdate(
        { key },
        { key, title, description, issuer: 'JetSet Cares', order: i + 1, isActive: true },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ),
    );
  }
  return results;
};

const getAll = async () => Badge.find().sort({ order: 1, title: 1 });

const upsert = async (payload: any) => {
  if (!payload.key || !payload.title || !payload.description) {
    throw new AppError(400, 'key, title and description are required');
  }
  return Badge.findOneAndUpdate({ key: payload.key }, payload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
};

const assign = async (payload: {
  userId?: string;
  email?: string;
  badgeId: string;
  awardedBy?: string;
  validThrough?: string;
  note?: string;
}) => {
  if (!mongoose.Types.ObjectId.isValid(payload.badgeId)) {
    throw new AppError(400, 'Invalid badgeId');
  }
  const user = payload.userId
    ? await User.findById(payload.userId)
    : await User.findOne({ email: payload.email?.toLowerCase() });
  if (!user) throw new AppError(404, 'User not found');

  const badge = await Badge.findById(payload.badgeId);
  if (!badge) throw new AppError(404, 'Badge not found');

  const existing = (user.badges || []).find(
    (item: any) => item.badge?.toString() === payload.badgeId && !item.revokedAt,
  );
  if (!existing) {
    user.badges = user.badges || [];
    user.badges.push({
      badge: badge._id,
      awardedBy: payload.awardedBy,
      verified: true,
      validThrough: payload.validThrough ? new Date(payload.validThrough) : undefined,
      note: payload.note || '',
      awardedAt: new Date(),
    } as any);
    await user.save();
  }

  return User.findById(user._id).populate('badges.badge').populate('badges.awardedBy', 'firstName lastName email');
};

const revoke = async (payload: { userId?: string; email?: string; badgeId: string }) => {
  const user = payload.userId
    ? await User.findById(payload.userId)
    : await User.findOne({ email: payload.email?.toLowerCase() });
  if (!user) throw new AppError(404, 'User not found');
  user.badges = (user.badges || []).map((item: any) =>
    item.badge?.toString() === payload.badgeId
      ? { ...item.toObject?.() ?? item, revokedAt: new Date(), verified: false }
      : item,
  ) as any;
  await user.save();
  return User.findById(user._id).populate('badges.badge');
};

export const badgeService = { seedDefaults, getAll, upsert, assign, revoke };
