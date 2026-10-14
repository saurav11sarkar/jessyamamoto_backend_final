import catchAsync from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../error/appError';
import pick from '../../helper/pick';
import { notificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req, res) => {
  if (!req.user?.id) throw new AppError(401, 'Unauthorized');
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await notificationService.getMyNotifications(
    req.user.id,
    options,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notifications fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  if (!req.user?.id) throw new AppError(401, 'Unauthorized');
  const result = await notificationService.getUnreadCount(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Unread count fetched successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  if (!req.user?.id) throw new AppError(401, 'Unauthorized');
  const { id } = req.params;
  const result = await notificationService.markAsRead(id!, req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  if (!req.user?.id) throw new AppError(401, 'Unauthorized');
  const result = await notificationService.markAllAsRead(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

export const notificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
