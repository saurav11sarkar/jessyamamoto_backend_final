import mongoose from 'mongoose';
import { ICategory } from './category.interface';

const CategorySchema = new mongoose.Schema<ICategory>(
  {
    image: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    banner: [{ type: String }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    findCareUser: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    findJobUser: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const Category = mongoose.model('Category', CategorySchema);
export default Category;
