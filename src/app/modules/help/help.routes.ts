import express from 'express';
import { serviceAuth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';
import { fileUploader } from '../../helper/fileUploder';
import { helpController } from './help.controller';
const router = express.Router();

router.post(
  '/',
  serviceAuth(userRole['find care'], userRole['find job']),
  fileUploader.upload.single('contactUs'),
  helpController.createHelp,
);

export const helpRoutes = router;
