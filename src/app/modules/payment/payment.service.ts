import AppError from '../../error/appError';
import pagination, { IOption } from '../../helper/pagenation';
import User from '../user/user.model';
import Payment from './payment.model';

// const allPayment = async (params: any, options: IOption) => {
//   const { page, limit, skip, sortBy, sortOrder } = pagination(options);
//   const { searchTerm, ...filterData } = params;

//   const andCondition: any[] = [];
//   const userSearchableFields = ['status', 'paymentType', 'userType'];

//   if (searchTerm) {
//     andCondition.push({
//       $or: userSearchableFields.map((field) => ({
//         [field]: { $regex: searchTerm, $options: 'i' },
//       })),
//     });
//   }

//   if (Object.keys(filterData).length) {
//     andCondition.push({
//       $and: Object.entries(filterData).map(([field, value]) => ({
//         [field]: value,
//       })),
//     });
//   }

//   const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

//   const result = await Payment.find(whereCondition)
//     .skip(skip)
//     .limit(limit)
//     .sort({ [sortBy]: sortOrder } as any)
//     .populate('user')
//     .populate({
//       path: 'service',
//       populate: {
//         path: 'categoryId',
//       },
//     })
//     .populate('category');

//   if (!result) {
//     throw new AppError(404, 'Payment not found');
//   }

//   const total = await Payment.countDocuments(whereCondition);

//   return {
//     data: result,
//     meta: {
//       total,
//       page,
//       limit,
//     },
//   };
// };

const allPayment = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, ...filterData } = params;

  const matchStage: any = {};

  // filter fields
  if (Object.keys(filterData).length) {
    Object.assign(matchStage, filterData);
  }

  const pipeline: any[] = [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  // search by payment + user fields
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { status: { $regex: searchTerm, $options: 'i' } },
          { paymentType: { $regex: searchTerm, $options: 'i' } },
          { userType: { $regex: searchTerm, $options: 'i' } },

          // user fields
          { 'user.email': { $regex: searchTerm, $options: 'i' } },
          { 'user.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'user.lastName': { $regex: searchTerm, $options: 'i' } },
          { 'user.role': { $regex: searchTerm, $options: 'i' } },
        ],
      },
    });
  }

  if (Object.keys(matchStage).length) {
    pipeline.push({ $match: matchStage });
  }

  // sorting
  pipeline.push({
    $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
  });

  // pagination
  pipeline.push({ $skip: skip }, { $limit: limit });

  const data = await Payment.aggregate(pipeline);

  const totalResult = await Payment.aggregate([
    ...pipeline.filter((stage) => !stage.$skip && !stage.$limit),
    { $count: 'total' },
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    data,
    meta: {
      total,
      page,
      limit,
    },
  };
};

const getAllUserPayment = async (
  userId: string,
  params: any,
  options: IOption,
) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = ['status', 'paymentType', 'userType'];

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

  andCondition.push({ user });

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Payment.find(whereCondition)
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any)
    .populate('user')
    .populate({
      path: 'service',
      populate: {
        path: 'categoryId',
      },
    })
    .populate('category')
    .populate('booking');

  if (!result) {
    throw new AppError(404, 'Payment not found');
  }

  const total = await Payment.countDocuments(whereCondition);

  return {
    data: result,
    meta: {
      total,
      page,
      limit,
    },
  };
};

const singlePayment = async (id: string) => {
  const result = await Payment.findById(id)
    .populate('user')
    .populate({
      path: 'service',
      populate: {
        path: 'categoryId',
      },
    })
    .populate('category')
    .populate('booking');
  if (!result) throw new AppError(404, 'Payment not found');
  return result;
};

const markProviderPaid = async (paymentId: string, paidAmount: number, payoutMethod: string, note?: string) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError(404, 'Payment not found');
  if (payment.paymentType !== 'booking') throw new AppError(400, 'Only booking payments have provider payouts');

  payment.providerPayoutStatus = 'paid';
  payment.providerPaidDate = new Date();
  payment.providerPaidAmount = paidAmount || payment.caregiverRate || payment.serviceProviderFree || 0;
  payment.providerPayoutMethod = payoutMethod || '';
  payment.providerPayoutNote = note || '';
  await payment.save();

  return payment;
};

const getProviderPayouts = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { providerPayoutStatus } = params;

  const andCondition: any[] = [{ paymentType: 'booking', status: 'completed' }];

  if (providerPayoutStatus) {
    andCondition.push({ providerPayoutStatus });
  }

  const whereCondition = { $and: andCondition };

  const result = await Payment.find(whereCondition)
    .populate({ path: 'user', select: 'firstName lastName email' })
    .populate({ path: 'service', select: 'firstName lastName email hourRate userId', populate: { path: 'userId', select: 'firstName lastName email phone' } })
    .populate({ path: 'booking', select: 'day date time status' })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy || 'createdAt']: sortOrder || 'desc' } as any);

  const total = await Payment.countDocuments(whereCondition);

  return { data: result, meta: { total, page, limit } };
};

export const paymentService = {
  allPayment,
  getAllUserPayment,
  singlePayment,
  markProviderPaid,
  getProviderPayouts,
};
