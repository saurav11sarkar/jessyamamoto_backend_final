import Notification from '../modules/notification/notification.model';
import { getIO } from '../../server';

export interface NotifyPayload {
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  conversationId?: string;
  messageId?: string;
}

// Persists a notification and pushes it live over the existing chat socket infrastructure
// (every logged-in user already joins a personal room keyed by their userId on connect) —
// same getIO()/room pattern message.controller.ts already uses.
const notifyUser = async (recipientId: string, payload: NotifyPayload) => {
  const doc = await Notification.create({
    recipient: recipientId,
    ...payload,
  });

  try {
    getIO().to(recipientId).emit('notification', doc);
  } catch (error) {
    console.error('Socket notification emit failed:', error);
  }

  return doc;
};

export default notifyUser;
