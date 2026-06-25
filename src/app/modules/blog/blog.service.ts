import AppError from '../../error/appError';
import { fileUploader } from '../../helper/fileUploder';
import pagination, { IOption } from '../../helper/pagenation';
import { IBlog } from './blog.interface';
import Blog from './blog.model';

const createBlog = async (
  payload: IBlog,
  file?: Express.Multer.File,
) => {
  if (file) {
    const uploaded = await fileUploader.uploadToCloudinary(file);
    payload.image = uploaded.url;
  }

  payload.slug = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existing = await Blog.findOne({ slug: payload.slug });
  if (existing) {
    payload.slug = `${payload.slug}-${Date.now()}`;
  }

  const result = await Blog.create(payload);
  if (!result) {
    throw new AppError(400, 'Blog creation failed');
  }
  return result;
};

const getAllBlogs = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andCondition: any[] = [];

  if (searchTerm) {
    andCondition.push({
      $or: ['title', 'content', 'excerpt'].map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  if (status) {
    andCondition.push({ status });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Blog.find(whereCondition)
    .populate('author', 'firstName lastName profileImage')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder } as any);

  const total = await Blog.countDocuments(whereCondition);

  return {
    data: result,
    meta: { total, page, limit },
  };
};

const getPublishedBlogs = async (params: any, options: IOption) => {
  const { page, limit, skip, sortBy, sortOrder } = pagination(options);
  const { searchTerm } = params;

  const andCondition: any[] = [{ status: 'published' }];

  if (searchTerm) {
    andCondition.push({
      $or: ['title', 'content', 'excerpt'].map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  const whereCondition = { $and: andCondition };

  const result = await Blog.find(whereCondition)
    .populate('author', 'firstName lastName profileImage')
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy || 'createdAt']: sortOrder || 'desc' } as any);

  const total = await Blog.countDocuments(whereCondition);

  return {
    data: result,
    meta: { total, page, limit },
  };
};

const getSingleBlog = async (slug: string) => {
  const result = await Blog.findOne({ slug }).populate('author', 'firstName lastName profileImage');
  if (!result) {
    throw new AppError(404, 'Blog not found');
  }
  return result;
};

const getBlogById = async (id: string) => {
  const result = await Blog.findById(id).populate('author', 'firstName lastName profileImage');
  if (!result) {
    throw new AppError(404, 'Blog not found');
  }
  return result;
};

const updateBlog = async (
  id: string,
  payload: Partial<IBlog>,
  file?: Express.Multer.File,
) => {
  if (file) {
    const uploaded = await fileUploader.uploadToCloudinary(file);
    payload.image = uploaded.url;
  }

  if (payload.title) {
    payload.slug = payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await Blog.findOne({ slug: payload.slug, _id: { $ne: id } });
    if (existing) {
      payload.slug = `${payload.slug}-${Date.now()}`;
    }
  }

  const result = await Blog.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new AppError(404, 'Blog not found');
  }
  return result;
};

const deleteBlog = async (id: string) => {
  const result = await Blog.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(404, 'Blog not found');
  }
  return result;
};

export const BlogService = {
  createBlog,
  getAllBlogs,
  getPublishedBlogs,
  getSingleBlog,
  getBlogById,
  updateBlog,
  deleteBlog,
};
