/**
 * Category page routes
 */

import { Router } from 'express';
import { categoryController, categoryApiController } from '@/controllers/category';

export const categoryRouter = Router();

// Category page
categoryRouter.get('/:slug', categoryController);

// Category API
categoryRouter.get('/api/:slug', categoryApiController);
