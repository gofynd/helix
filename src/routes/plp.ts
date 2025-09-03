/**
 * Product listing page routes
 */

import { Router } from 'express';
import { plpController, plpApiController } from '@/controllers/plp';

export const plpRouter = Router();

// Product listing page
plpRouter.get('/', plpController);

// Product listing API
plpRouter.get('/api', plpApiController);
