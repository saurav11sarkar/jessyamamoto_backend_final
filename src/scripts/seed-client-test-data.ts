import mongoose from 'mongoose';
import config from '../app/config';
import Category from '../app/modules/category/category.model';
import Service from '../app/modules/service/service.model';
import Subscription from '../app/modules/subscription/subscription.model';
import User from '../app/modules/user/user.model';
import { badgeService } from '../app/modules/badge/badge.service';

const TEST_PASSWORD = 'ClientTest123!';

const connectDb = async () => {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is missing in backend .env');
  }
  await mongoose.connect(config.mongoUri);
};

const upsertSubscription = async (payload: {
  type: string;
  title: string;
  price: number;
  description: string;
  content: string;
  bookingFeePercent: number;
  bookingFeeMinimum: number;
}) => {
  return Subscription.findOneAndUpdate({ type: payload.type }, payload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
};

const upsertUser = async (payload: {
  email: string;
  firstName: string;
  lastName: string;
  role: 'find care' | 'find job';
  gender: 'male' | 'female' | 'other';
  phone: string;
  location: string;
  city: string;
  countery: string;
  profileImage: string;
  bio: string;
  isSubscription?: boolean;
  subscription?: mongoose.Types.ObjectId;
  subscriptionExpiry?: Date;
}) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    existing.firstName = payload.firstName;
    existing.lastName = payload.lastName;
    existing.role = payload.role;
    existing.roles = [payload.role];
    existing.gender = payload.gender;
    existing.phone = payload.phone;
    existing.location = payload.location;
    existing.city = payload.city;
    existing.countery = payload.countery;
    existing.profileImage = payload.profileImage;
    existing.bio = payload.bio;
    existing.status = 'active';
    existing.userStatus = 'approved';
    existing.verified = true;
    existing.isSubscription = payload.isSubscription || false;
    if (payload.subscription) existing.subscription = payload.subscription;
    else existing.set('subscription', undefined);
    if (payload.subscriptionExpiry) existing.subscriptionExpiry = payload.subscriptionExpiry;
    else existing.set('subscriptionExpiry', undefined);
    await existing.save();
    return existing;
  }

  return User.create({
    ...payload,
    password: TEST_PASSWORD,
    roles: [payload.role],
    status: 'active',
    userStatus: 'approved',
    verified: true,
  });
};

const upsertPartnerProfile = async (
  userId: mongoose.Types.ObjectId,
  updates: Record<string, unknown>,
) => {
  await User.findByIdAndUpdate(userId, {
    $set: {
      exprience: 6,
      experiences: ['Hotel babysitting', 'Travel family support'],
      language: [
        { language: 'English', proficiency: 'Native / Bilingual', isNative: true },
        { language: 'Thai', proficiency: 'Conversational', isNative: false },
      ],
      agegroup: ['Infant', 'Toddler', 'Preschool', 'School age'],
      education: ['CPR Training', 'Early Childhood Care'],
      canHelpWith: ['Bedtime routine', 'Meals', 'Homework', 'Hotel care'],
      professionalSkill: ['CPR Certified', 'ID Verified', 'Background Checked'],
      certifications: ['ID Verified', 'CPR Certified', 'Background Checked'],
      ...updates,
    },
  });
};

const upsertService = async (payload: {
  userId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  hourRate: number;
  location: string;
  days: Array<{ day: string; startTime: string; endTime: string }>;
}) => {
  const service = await Service.findOneAndUpdate(
    {
      userId: payload.userId,
      categoryId: payload.categoryId,
      role: 'find job',
    },
    {
      ...payload,
      role: 'find job',
      status: 'pending',
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  await User.findByIdAndUpdate(payload.userId, {
    $addToSet: {
      category: payload.categoryId,
      service: service._id,
    },
  });
  await Category.findByIdAndUpdate(payload.categoryId, {
    $addToSet: { findJobUser: payload.userId },
  });

  return service;
};

const seed = async () => {
  await connectDb();

  const monthly = await upsertSubscription({
    type: 'monthly',
    title: 'Monthly Membership',
    price: 19.99,
    description: 'Monthly member savings for JetSet Cares bookings.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Member booking savings, Cancel according to plan terms',
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
  });

  await upsertSubscription({
    type: '6month',
    title: '6-Month Membership',
    price: 54.99,
    description: '6-month member savings for families who book while traveling.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Best short-term travel value, Member booking savings',
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
  });

  await upsertSubscription({
    type: 'annual',
    title: 'Annual Membership',
    price: 179,
    description: 'Annual member savings for frequent family travel.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Annual member value, Member booking savings',
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
  });

  const category = await Category.findOneAndUpdate(
    { name: 'Babysitting' },
    {
      name: 'Babysitting',
      image: 'https://res.cloudinary.com/demo/image/upload/v1700000000/babysitting.png',
      description: 'Trusted babysitting and hotel childcare for traveling families.',
      banner: [
        'https://res.cloudinary.com/demo/image/upload/v1700000000/babysitting-banner.jpg',
      ],
      isActive: true,
      order: 1,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const defaultBadges = await badgeService.seedDefaults();

  const memberExpiry = new Date();
  memberExpiry.setMonth(memberExpiry.getMonth() + 1);

  const nonMemberParent = await upsertUser({
    email: 'client.parent.free@jetset.test',
    firstName: 'Client',
    lastName: 'Free Parent',
    role: 'find care',
    gender: 'female',
    phone: '+15550001001',
    location: 'Mandarin Oriental Bangkok',
    city: 'Bangkok',
    countery: 'Thailand',
    profileImage: 'https://avatar.iran.liara.run/public/42.png',
    bio: 'Client test parent without membership.',
    isSubscription: false,
  });

  const memberParent = await upsertUser({
    email: 'client.parent.member@jetset.test',
    firstName: 'Client',
    lastName: 'Member Parent',
    role: 'find care',
    gender: 'female',
    phone: '+15550001002',
    location: 'Four Seasons Bangkok',
    city: 'Bangkok',
    countery: 'Thailand',
    profileImage: 'https://avatar.iran.liara.run/public/43.png',
    bio: 'Client test parent with active monthly membership.',
    isSubscription: true,
    subscription: monthly._id,
    subscriptionExpiry: memberExpiry,
  });

  const partnerA = await upsertUser({
    email: 'client.partner.anna@jetset.test',
    firstName: 'Anna',
    lastName: 'Rivera',
    role: 'find job',
    gender: 'female',
    phone: '+66810001001',
    location: 'Bangkok Riverside',
    city: 'Bangkok',
    countery: 'Thailand',
    profileImage: 'https://avatar.iran.liara.run/public/44.png',
    bio: 'CPR certified hotel babysitter available for evening bookings.',
  });

  const partnerB = await upsertUser({
    email: 'client.partner.maya@jetset.test',
    firstName: 'Maya',
    lastName: 'Chen',
    role: 'find job',
    gender: 'female',
    phone: '+66810001002',
    location: 'Sukhumvit Bangkok',
    city: 'Bangkok',
    countery: 'Thailand',
    profileImage: 'https://avatar.iran.liara.run/public/45.png',
    bio: 'Background checked caregiver for daytime hotel childcare.',
  });

  await upsertPartnerProfile(partnerA._id, {
    neighborhoods: 'Riverside, Sathorn, Silom',
  });
  await upsertPartnerProfile(partnerB._id, {
    neighborhoods: 'Sukhumvit, Thonglor, Phrom Phong',
  });

  const badgeByKey = new Map(defaultBadges.map((badge: any) => [badge.key, badge]));
  for (const key of ['id_verified', 'background_checked', 'cpr_certified', 'hotel_babysitting']) {
    const badge = badgeByKey.get(key) as any;
    if (badge) {
      await badgeService.assign({
        userId: partnerA._id.toString(),
        badgeId: badge._id.toString(),
        validThrough: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        note: 'Seeded for client marketplace testing.',
      });
    }
  }
  for (const key of ['id_verified', 'first_aid', 'toddler_care', 'language_support']) {
    const badge = badgeByKey.get(key) as any;
    if (badge) {
      await badgeService.assign({
        userId: partnerB._id.toString(),
        badgeId: badge._id.toString(),
        validThrough: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        note: 'Seeded for client marketplace testing.',
      });
    }
  }

  const serviceA = await upsertService({
    userId: partnerA._id,
    categoryId: category._id,
    email: partnerA.email,
    firstName: partnerA.firstName,
    lastName: partnerA.lastName || '',
    gender: partnerA.gender || 'female',
    hourRate: 25,
    location: 'Bangkok Riverside',
    days: [
      { day: 'Sunday', startTime: '09:00', endTime: '18:00' },
      { day: 'Monday', startTime: '09:00', endTime: '18:00' },
      { day: 'Tuesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '18:00' },
      { day: 'Thursday', startTime: '09:00', endTime: '18:00' },
      { day: 'Friday', startTime: '09:00', endTime: '18:00' },
      { day: 'Saturday', startTime: '09:00', endTime: '18:00' },
    ],
  });

  const serviceB = await upsertService({
    userId: partnerB._id,
    categoryId: category._id,
    email: partnerB.email,
    firstName: partnerB.firstName,
    lastName: partnerB.lastName || '',
    gender: partnerB.gender || 'female',
    hourRate: 18,
    location: 'Sukhumvit Bangkok',
    days: [
      { day: 'Monday', startTime: '08:00', endTime: '16:00' },
      { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Wednesday', startTime: '08:00', endTime: '16:00' },
      { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
      { day: 'Friday', startTime: '08:00', endTime: '16:00' },
    ],
  });

  console.log('Client test data ready.');
  console.log('');
  console.log('Login password for all test users:', TEST_PASSWORD);
  console.log('');
  console.table([
    {
      role: 'Parent non-member',
      email: nonMemberParent.email,
      expectedFee: '25%, minimum $5.00',
    },
    {
      role: 'Parent member',
      email: memberParent.email,
      expectedFee: '12.5%, minimum $3.00',
    },
    {
      role: 'Partner',
      email: partnerA.email,
      serviceId: serviceA._id.toString(),
      rate: '$25/hr',
    },
    {
      role: 'Partner',
      email: partnerB.email,
      serviceId: serviceB._id.toString(),
      rate: '$18/hr',
    },
  ]);
};

seed()
  .catch((error) => {
    console.error('Failed to seed client test data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
