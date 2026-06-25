import express from 'express';
import { userController } from './user.controller';

import { fileUploader } from '../../helper/fileUploder';
import { userRole } from './user.constant';
import { auth } from '../../middlewares/auth';

const router = express.Router();

router.post('/', auth(userRole.admin), userController.createUser);

router.get(
  '/profile',
  auth(userRole.admin, userRole['find care'], userRole['find job'], userRole.ambassador),
  userController.profile,
);
router.put(
  '/profile',
  auth(userRole.admin, userRole['find care'], userRole['find job'], userRole.ambassador),
  fileUploader.upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'galary', maxCount: 6 },
    { name: 'certifications', maxCount: 10 },
  ]),
  userController.updateMyProfile,
);
router.get('/all-user', auth(userRole.admin), userController.getAllUser);
router.patch(
  '/update-galary',
  auth(userRole.admin, userRole['find care'], userRole['find job'], userRole.ambassador),
  fileUploader.upload.array('galary', 6),
  userController.uploadGalaryImages,
);
router.patch(
  '/update-certifications',
  auth(userRole.admin, userRole['find care'], userRole['find job'], userRole.ambassador),
  fileUploader.upload.array('certifications'),
  userController.certificationsUpload,
);

router.put(
  '/:id',
  auth(userRole.admin),
  fileUploader.upload.array('profileImage'),
  userController.updateUserById,
);
router.get('/:id', auth(userRole.admin, userRole['find care'], userRole['find job'], userRole.ambassador), userController.getUserById);
router.delete('/:id', auth(userRole.admin), userController.deleteUserById);

export const userRoutes = router;
