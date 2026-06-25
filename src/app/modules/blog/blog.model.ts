import mongoose from 'mongoose';
import { IBlog } from './blog.interface';

const BlogSchema = new mongoose.Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    image: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

const Blog = mongoose.model('Blog', BlogSchema);
export default Blog;
