/**
 * Cart controllers
 * Supports both anonymous and authenticated carts
 */

import { Request, Response } from 'express';
import { CatalogService } from '@/services/catalog';
import { requestLogger } from '@/lib/logger';

/**
 * Cart page controller (supports anonymous carts)
 */
export const cartPageController = async (req: Request, res: Response): Promise<void> => {
  const logger = requestLogger(req.id);
  const context = (req as any).context;
  const user = (req as any).user;

  try {
    // Get cart ID from session/cookies or user
    let cartId = req.cookies?.cartId;
    
    if (user) {
      // If user is logged in, try to get user's cart
      const userCart = await CatalogService.getUserCart(context, user.id);
      if (userCart) {
        cartId = userCart.id;
      }
    }

    let cartItems = [];
    let cartSummary = null;

    if (cartId) {
      // Get cart items
      cartItems = await CatalogService.getCartItems(context, cartId);
      cartSummary = await CatalogService.getCartSummary(context, cartId);
    }

    res.render('pages/cart', {
      title: 'Shopping Cart',
      cartItems: cartItems || [],
      cartSummary: cartSummary || {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      },
      pageName: 'cart',
      user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to render cart page');
    res.status(500).render('errors/500', {
      title: 'Error',
      error: 'Unable to load cart',
    });
  }
};

/**
 * Add item to cart controller (supports anonymous carts)
 */
export const addToCartController = async (req: Request, res: Response): Promise<void> => {
  const logger = requestLogger(req.id);
  const context = (req as any).context;
  const user = (req as any).user;

  try {
    const { productSlug, variantId, quantity = 1 } = req.body;

    if (!productSlug) {
      res.status(400).json({
        success: false,
        message: 'Product slug is required',
      });
      return;
    }

    // Get or create cart
    let cartId = req.cookies?.cartId;
    
    if (user) {
      // If user is logged in, use user's cart
      const userCart = await CatalogService.getUserCart(context, user.id);
      cartId = userCart?.id || await CatalogService.createCart(context, user.id);
    } else if (!cartId) {
      // Create anonymous cart
      cartId = await CatalogService.createAnonymousCart(context);
      // Set cart ID in cookie
      res.cookie('cartId', cartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // Add item to cart
    const result = await CatalogService.addToCart(context, cartId, {
      productSlug,
      variantId,
      quantity,
    });

    res.json({
      success: true,
      message: 'Added to cart',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to add item to cart');
    res.status(500).json({
      success: false,
      message: 'Unable to add to cart',
    });
  }
};

/**
 * Update cart item controller
 */
export const updateCartItemController = async (req: Request, res: Response): Promise<void> => {
  const logger = requestLogger(req.id);
  const context = (req as any).context;
  const { itemId } = req.params;
  const { quantity } = req.body;

  try {
    const cartId = req.cookies?.cartId;
    
    if (!cartId) {
      res.status(400).json({
        success: false,
        message: 'Cart not found',
      });
      return;
    }

    if (!itemId || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required',
      });
      return;
    }

    // Update cart item
    const result = await CatalogService.updateCartItem(context, cartId, itemId, quantity);

    res.json({
      success: true,
      message: 'Cart updated',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update cart item');
    res.status(500).json({
      success: false,
      message: 'Unable to update cart',
    });
  }
};

/**
 * Remove item from cart controller
 */
export const removeFromCartController = async (req: Request, res: Response): Promise<void> => {
  const logger = requestLogger(req.id);
  const context = (req as any).context;
  const { itemId } = req.params;

  try {
    const cartId = req.cookies?.cartId;
    
    if (!cartId) {
      res.status(400).json({
        success: false,
        message: 'Cart not found',
      });
      return;
    }

    if (!itemId) {
      res.status(400).json({
        success: false,
        message: 'Item ID is required',
      });
      return;
    }

    // Remove item from cart
    const result = await CatalogService.removeFromCart(context, cartId, itemId);

    res.json({
      success: true,
      message: 'Removed from cart',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove item from cart');
    res.status(500).json({
      success: false,
      message: 'Unable to remove from cart',
    });
  }
};

/**
 * Clear cart controller
 */
export const clearCartController = async (req: Request, res: Response): Promise<void> => {
  const logger = requestLogger(req.id);
  const context = (req as any).context;

  try {
    const cartId = req.cookies?.cartId;
    
    if (!cartId) {
      res.status(400).json({
        success: false,
        message: 'Cart not found',
      });
      return;
    }

    // Clear cart
    const result = await CatalogService.clearCart(context, cartId);

    res.json({
      success: true,
      message: 'Cart cleared',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to clear cart');
    res.status(500).json({
      success: false,
      message: 'Unable to clear cart',
    });
  }
};
