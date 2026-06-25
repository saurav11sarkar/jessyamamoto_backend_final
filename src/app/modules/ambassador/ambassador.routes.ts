import express from 'express';
import { AmbassadorController } from './ambassador.controller';
import { auth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';

const router = express.Router();

router.post('/', auth(userRole.admin), AmbassadorController.createAmbassador);
router.get('/', auth(userRole.admin), AmbassadorController.getAllAmbassadors);
router.get('/founder-board', auth(userRole.admin), AmbassadorController.getFounderBoard);
router.get('/my-dashboard', auth(userRole.ambassador), AmbassadorController.getMyDashboard);
router.get('/verify/:code', AmbassadorController.verifyReferralCode);
router.get('/:id', auth(userRole.admin), AmbassadorController.getAmbassadorById);
router.put('/:id', auth(userRole.admin), AmbassadorController.updateAmbassador);
router.delete('/:id', auth(userRole.admin), AmbassadorController.deleteAmbassador);
router.post('/assign-provider', auth(userRole.admin), AmbassadorController.assignToProvider);
router.get('/:id/commissions', auth(userRole.admin), AmbassadorController.getCommissionReport);
router.patch('/commission/:id/pay', auth(userRole.admin), AmbassadorController.markCommissionPaid);

export const ambassadorRoutes = router;
