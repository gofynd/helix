/**
 * Wishlist controllers
 */

import { Request, Response } from 'express';
import { CatalogService } from '@/services/catalog';
import { requestLogger } from '@/lib/logger';
import { requireAuth } from '@/middlewares/auth';

/**
 * Wishlist page controller
 */
export const wishlistPageController = [
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;
    const user = (req as any).user;

    try {
      // Get wishlist items for the user
      const wishlistItems = await CatalogService.getUserWishlist(context, user.id);

      res.render('pages/wishlist', {
        title: 'My Wishlist',
        wishlistItems: wishlistItems || [],
        pageName: 'wishlist',
        user,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to render wishlist page');
      res.status(500).render('errors/500', {
        title: 'Error',
        error: 'Unable to load wishlist',
      });
    }
  }
];

/**
 * Add item to wishlist controller
 */
export const addToWishlistController = [
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;
    const user = (req as any).user;

    try {
      const { productSlug, variantId } = req.body;

      if (!productSlug) {
        res.status(400).json({
          success: false,
          message: 'Product slug is required',
        });
        return;
      }

      // Add item to wishlist
      const result = await CatalogService.addToWishlist(context, user.id, {
        productSlug,
        variantId,
      });

      res.json({
        success: true,
        message: 'Added to wishlist',
        data: result,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to add item to wishlist');
      res.status(500).json({
        success: false,
        message: 'Unable to add to wishlist',
      });
    }
  }
];

/**
 * Remove item from wishlist controller
 */
export const removeFromWishlistController = [
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;
    const user = (req as any).user;
    const { itemId } = req.params;

    try {
      if (!itemId) {
        res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
        return;
      }

      // Remove item from wishlist
      const result = await CatalogService.removeFromWishlist(context, user.id, itemId);

      res.json({
        success: true,
        message: 'Removed from wishlist',
        data: result,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to remove item from wishlist');
      res.status(500).json({
        success: false,
        message: 'Unable to remove from wishlist',
      });
    }
  }
];
