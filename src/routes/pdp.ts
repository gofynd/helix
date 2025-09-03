/**
 * Product detail page routes
 */

import { Router } from 'express';
import { pdpController, pdpApiController } from '@/controllers/pdp';

export const pdpRouter = Router();

// Product detail page
pdpRouter.get('/:slug', pdpController);

// Product detail API
pdpRouter.get('/api/:slug', pdpApiController);
