import { Types } from 'mongoose';

export interface IBlog {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  image?: string;
  author: Types.ObjectId;
  status: 'draft' | 'published';
  tags?: string[];
}
