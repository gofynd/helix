/**
 * Brands listing routes
 */

import { Router } from 'express';
import { brandsController, brandsApiController } from '@/controllers/brands';

export const brandsRouter = Router();

// Brands listing page
brandsRouter.get('/', brandsController);

// Brands API endpoint
brandsRouter.get('/api', brandsApiController);
