/**
 * Categories listing routes
 */

import { Router } from 'express';
import { categoriesController, categoriesApiController } from '@/controllers/categories';

export const categoriesRouter = Router();

// Categories listing page
categoriesRouter.get('/', categoriesController);

// Categories listing API
categoriesRouter.get('/api', categoriesApiController);
