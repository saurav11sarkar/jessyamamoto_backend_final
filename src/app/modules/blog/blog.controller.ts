import pick from '../../helper/pick';
import catchAsync from '../../utils/catchAsycn';
import sendResponse from '../../utils/sendResponse';
import { BlogService } from './blog.service';

const createBlog = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const formData = req.body.data ? JSON.parse(req.body.data) : req.body;
  formData.author = req.user.id;

  const result = await BlogService.createBlog(formData, file);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Blog created successfully',
    data: result,
  });
});

const getAllBlogs = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['searchTerm', 'status']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await BlogService.getAllBlogs(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blogs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getPublishedBlogs = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['searchTerm']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await BlogService.getPublishedBlogs(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blogs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleBlog = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const result = await BlogService.getSingleBlog(slug!);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blog retrieved successfully',
    data: result,
  });
});

const getBlogById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await BlogService.getBlogById(id!);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blog retrieved successfully',
    data: result,
  });
});

const updateBlog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file as Express.Multer.File;
  const formData = req.body.data ? JSON.parse(req.body.data) : req.body;

  const result = await BlogService.updateBlog(id!, formData, file);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blog updated successfully',
    data: result,
  });
});

const deleteBlog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await BlogService.deleteBlog(id!);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blog deleted successfully',
    data: result,
  });
});

export const BlogController = {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getSingleBlog,
  getBlogById,
  updateBlog,
  deleteBlog,
};
