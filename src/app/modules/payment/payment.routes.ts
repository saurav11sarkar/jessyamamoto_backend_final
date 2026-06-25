import express from 'express';
import { auth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';
import { paymentController } from './payment.controller';
const router = express.Router();

router.get('/', auth(userRole.admin), paymentController.allPayment);
router.get('/provider-payouts', auth(userRole.admin), paymentController.getProviderPayouts);
router.get(
  '/user',
  auth(userRole['find care'], userRole['find job']),
  paymentController.getAllUserPayment,
);
router.patch(
  '/:id/provider-paid',
  auth(userRole.admin),
  paymentController.markProviderPaid,
);
router.get(
  '/:id',
  auth(userRole.admin, userRole['find care'], userRole['find job']),
  paymentController.singlePayment,
);

export const paymentRouter = router;
