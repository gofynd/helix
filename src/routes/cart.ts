/**
 * Cart routes
 */

import { Router } from 'express';
import {
  cartPageController,
  addToCartController,
  updateCartItemController,
  removeFromCartController,
  clearCartController,
} from '@/controllers/cart';

export const cartRouter = Router();

// Cart page
cartRouter.get('/', cartPageController);

// API endpoints for cart management
cartRouter.post('/api/add', addToCartController);
cartRouter.put('/api/update/:itemId', updateCartItemController);
cartRouter.delete('/api/remove/:itemId', removeFromCartController);
cartRouter.delete('/api/clear', clearCartController);
