import { ISubscription } from './subscription.interface';
import Subscription from './subscription.model';
import AppError from '../../error/appError';
import { IOption } from '../../helper/pagenation';
import pagination from '../../helper/pagenation';

const standardPlans: ISubscription[] = [
  {
    type: 'free',
    title: 'Free Membership',
    price: 0,
    bookingFeePercent: 25,
    bookingFeeMinimum: 5,
    description:
      'Create a JetSet Cares account, explore care options, and book without paid member savings.',
    content:
      'Free account access, Browse trusted care profiles, Upgrade anytime for member savings',
  },
  {
    type: 'monthly',
    title: 'Monthly Membership',
    price: 24.99,
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
    description: 'Monthly member savings for JetSet Cares bookings.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Member pricing on every eligible booking, Cancel according to plan terms',
  },
  {
    type: '6month',
    title: '6-Month Membership',
    price: 129.99,
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
    description: '6-month member savings for families who book while traveling.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Save compared with six monthly payments, Six-month billing',
  },
  {
    type: 'annual',
    title: 'Annual Membership',
    price: 249.99,
    bookingFeePercent: 12.5,
    bookingFeeMinimum: 3,
    description: 'Annual member savings for frequent family travel.',
    content:
      '12.5% Trusted Booking Fee, $3 minimum booking fee, Annual member value, Annual billing',
  },
];

const normalizeDefaultSubscriptions = async () => {
  const quarterly = await Subscription.findOne({ type: 'quarterly' });
  const sixMonth = await Subscription.findOne({ type: '6month' });

  if (quarterly && !sixMonth) {
    await Subscription.findByIdAndUpdate(quarterly._id, {
      type: '6month',
      title: '6-Month Membership',
      price: 129.99,
      bookingFeePercent: 12.5,
      bookingFeeMinimum: 3,
      description:
        '6-month member savings for families who book while traveling.',
      content:
        '12.5% Trusted Booking Fee, $3 minimum booking fee, Save compared with six monthly payments, Six-month billing',
    });
  }

  await Promise.all(
    standardPlans.map((plan) =>
      Subscription.findOneAndUpdate(
        { type: plan.type },
        {
          $setOnInsert: plan,
          $set: {
            title: plan.title,
            price: plan.price,
            bookingFeePercent: plan.bookingFeePercent,
            bookingFeeMinimum: plan.bookingFeeMinimum,
            description: plan.description,
            content: plan.content,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );
};

const createSubscription = async (payload: ISubscription) => {
  const result = await Subscription.create(payload);

  if (!result) {
    throw new AppError(400, 'Subscription creation failed');
  }

  return result;
};

const getAllSubscriptions = async (params: any, options: IOption) => {
  await normalizeDefaultSubscriptions();

  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = ['type', 'title', 'description', 'content'];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  andCondition.push({
    title: { $not: /child/i },
    type: { $not: /child|quarterly/i },
  });

  const whereCondition = { $and: andCondition };

  const result = await Subscription.find(whereCondition)
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  if (!result) {
    throw new AppError(404, 'Subscription not found');
  }

  const total = await Subscription.countDocuments(whereCondition);

  return {
    data: result,
    meta: {
      total,
      page,
      limit,
    },
  };
};

const singleSubscription = async (subscriptionId: string) => {
  const result = await Subscription.findById(subscriptionId);
  if (!result) {
    throw new AppError(400, 'Subscription not found');
  }
  return result;
};

const updateSubscription = async (
  subscriptionId: string,
  payload: Partial<ISubscription>,
) => {
  const existing = await Subscription.findById(subscriptionId);
  if (!existing) {
    throw new AppError(400, 'Subscription not found');
  }
  if (existing.type === 'free' && payload.type && payload.type !== 'free') {
    throw new AppError(
      400,
      'The Free / Non-Member plan type cannot be changed.',
    );
  }

  const result = await Subscription.findByIdAndUpdate(subscriptionId, payload, {
    new: true,
  });
  if (!result) {
    throw new AppError(400, 'Subscription not found');
  }
  return result;
};

const deleteSubscription = async (subscriptionId: string) => {
  const existing = await Subscription.findById(subscriptionId);
  if (!existing) {
    throw new AppError(400, 'Subscription not found');
  }
  if (existing.type === 'free') {
    throw new AppError(
      400,
      'The Free / Non-Member plan cannot be deleted. Edit its fee and minimum instead.',
    );
  }

  const result = await Subscription.findByIdAndDelete(subscriptionId);
  return result;
};

export const subscriptionService = {
  createSubscription,
  getAllSubscriptions,
  singleSubscription,
  updateSubscription,
  deleteSubscription,
};
