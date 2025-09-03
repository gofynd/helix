/**
 * Home page routes
 */

import { Router } from 'express';
import { homeController, homeDataController } from '@/controllers/home';

export const homeRouter = Router();

// Home page
homeRouter.get('/', homeController);

// Home page data API
homeRouter.get('/api/home', homeDataController);
