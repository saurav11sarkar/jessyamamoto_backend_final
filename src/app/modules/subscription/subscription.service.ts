import { ISubscription } from './subscription.interface';
import Subscription from './subscription.model';
import AppError from '../../error/appError';
import { IOption } from '../../helper/pagenation';
import pagination from '../../helper/pagenation';


const createSubscription = async (payload: ISubscription) => {
  const result = await Subscription.create(payload);

  if (!result) {
    throw new AppError(400, 'Subscription creation failed');
  }

  return result;
};

const getAllSubscriptions = async (params: any, options: IOption) => {
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
    type: { $not: /child/i },
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
