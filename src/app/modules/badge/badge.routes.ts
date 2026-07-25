import express from 'express';
import { auth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';
import { badgeController } from './badge.controller';

const router = express.Router();

router.get('/', badgeController.getAll);
router.post('/seed-defaults', auth(userRole.admin), badgeController.seedDefaults);
router.post('/', auth(userRole.admin), badgeController.upsert);
router.post('/assign', auth(userRole.admin), badgeController.assign);
router.post('/revoke', auth(userRole.admin), badgeController.revoke);

export const badgeRouter = router;
