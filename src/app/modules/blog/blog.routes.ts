import express from 'express';
import { BlogController } from './blog.controller';
import { auth } from '../../middlewares/auth';
import { userRole } from '../user/user.constant';
import { fileUploader } from '../../helper/fileUploder';

const router = express.Router();

router.post(
  '/',
  auth(userRole.admin),
  fileUploader.upload.single('image'),
  BlogController.createBlog,
);

router.get('/', BlogController.getAllBlogs);
router.get('/published', BlogController.getPublishedBlogs);
router.get('/slug/:slug', BlogController.getSingleBlog);
router.get('/:id', BlogController.getBlogById);

router.put(
  '/:id',
  auth(userRole.admin),
  fileUploader.upload.single('image'),
  BlogController.updateBlog,
);

router.delete('/:id', auth(userRole.admin), BlogController.deleteBlog);

export const blogRoutes = router;
