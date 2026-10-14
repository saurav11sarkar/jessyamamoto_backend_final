import Notification from './notification.model';
import AppError from '../../error/appError';
import pagination, { IOption } from '../../helper/pagenation';

const getMyNotifications = async (userId: string, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);

  const result = await Notification.find({ recipient: userId })
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Notification.countDocuments({ recipient: userId });

  return {
    data: result,
    meta: { total, page, limit },
  };
};

const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    read: false,
  });
  return { count };
};

const markAsRead = async (id: string, userId: string) => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, recipient: userId },
    { read: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(404, 'Notification not found');
  }
  return result;
};

const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true },
  );
  return { success: true };
};

export const notificationService = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
