import catchAsync from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendResponse';
import { badgeService } from './badge.service';

const seedDefaults = catchAsync(async (_req, res) => {
  const result = await badgeService.seedDefaults();
  sendResponse(res, { statusCode: 200, success: true, message: 'Badges seeded', data: result });
});

const getAll = catchAsync(async (_req, res) => {
  const result = await badgeService.getAll();
  sendResponse(res, { statusCode: 200, success: true, message: 'Badges fetched', data: result });
});

const upsert = catchAsync(async (req, res) => {
  const result = await badgeService.upsert(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: 'Badge saved', data: result });
});

const assign = catchAsync(async (req, res) => {
  const result = await badgeService.assign({ ...req.body, awardedBy: req.user?.id });
  sendResponse(res, { statusCode: 200, success: true, message: 'Badge assigned', data: result });
});

const revoke = catchAsync(async (req, res) => {
  const result = await badgeService.revoke(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: 'Badge revoked', data: result });
});

export const badgeController = { seedDefaults, getAll, upsert, assign, revoke };
