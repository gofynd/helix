/**
 * Product detail page routes
 */

import { Router } from 'express';
import { pdpController, pdpApiController, productPriceApiController } from '@/controllers/pdp';

export const pdpRouter = Router();

// Product detail page
pdpRouter.get('/:slug', pdpController);

// Product detail API
pdpRouter.get('/api/:slug', pdpApiController);

// Product price API
pdpRouter.get('/api/:slug/price', productPriceApiController);
