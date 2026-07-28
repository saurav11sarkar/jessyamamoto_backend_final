import express from 'express';
import { auth } from '../../middlewares/auth';
import { notificationController } from './notification.controller';

const router = express.Router();

router.get('/', auth(), notificationController.getMyNotifications);
router.get('/unread-count', auth(), notificationController.getUnreadCount);
router.patch('/read-all', auth(), notificationController.markAllAsRead);
router.patch('/:id/read', auth(), notificationController.markAsRead);

export const notificationRouter = router;
