/**
 * Wishlist routes
 */

import { Router } from 'express';
import {
  wishlistPageController,
  addToWishlistController,
  removeFromWishlistController,
} from '@/controllers/wishlist';

export const wishlistRouter = Router();

// Wishlist page
wishlistRouter.get('/', wishlistPageController);

// API endpoints for wishlist management
wishlistRouter.post('/api/add', addToWishlistController);
wishlistRouter.delete('/api/remove/:itemId', removeFromWishlistController);
