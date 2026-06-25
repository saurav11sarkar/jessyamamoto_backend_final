import express from 'express';
import { subscriptionController } from './subscription.controller';
import { auth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';

const router = express.Router();

router.post('/', auth(userRole.admin), subscriptionController.createSubscription);
router.get('/', subscriptionController.getAllSubscriptions);
router.get('/:id', subscriptionController.singleSubscription);
router.put('/:id', auth(userRole.admin), subscriptionController.updateSubscription);
router.delete('/:id', auth(userRole.admin), subscriptionController.deleteSubscription);

export const subscriptionRouter = router;
