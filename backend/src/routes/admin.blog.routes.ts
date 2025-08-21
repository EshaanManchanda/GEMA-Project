import { Router } from 'express';
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
  getBlogById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategoriesAdmin
} from '../controllers/blog.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin blog routes require authentication and admin/superadmin role
router.use(authenticate);
router.use(authorize(['admin', 'superadmin']));

// Blog management routes
router.route('/blogs')
  .get(getAllBlogsAdmin)
  .post(createBlog);

router.route('/blogs/:id')
  .get(getBlogById)
  .put(updateBlog)
  .delete(deleteBlog);

// Blog category management routes
router.route('/categories')
  .get(getAllCategoriesAdmin)
  .post(createCategory);

router.route('/categories/:id')
  .put(updateCategory)
  .delete(deleteCategory);

export default router;