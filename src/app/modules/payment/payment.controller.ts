import pick from '../../helper/pick';
import catchAsync from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendResponse';
import { paymentService } from './payment.service';

const allPayment = catchAsync(async (req, res) => {
  const filters = pick(req.query, [
    'searchTerm',
    'status',
    'paymentType',
    'userType',
    'user.email',
    'user.firstName',
    'user.lastName',
    'user.role',
  ]);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await paymentService.allPayment(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getAllUserPayment = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const filters = pick(req.query, [
    'searchTerm',
    'status',
    'paymentType',
    'userType',
  ]);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await paymentService.getAllUserPayment(
    userId,
    filters,
    options,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment user retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const singlePayment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await paymentService.singlePayment(id!);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment retrieved successfully',
    data: result,
  });
});

const markProviderPaid = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { paidAmount, payoutMethod, note } = req.body;
  const result = await paymentService.markProviderPaid(id!, paidAmount, payoutMethod, note);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Provider payout marked as paid',
    data: result,
  });
});

const getProviderPayouts = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['searchTerm', 'providerPayoutStatus']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await paymentService.getProviderPayouts(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Provider payouts retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const paymentController = {
  allPayment,
  getAllUserPayment,
  singlePayment,
  markProviderPaid,
  getProviderPayouts,
};
