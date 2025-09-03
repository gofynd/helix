/**
 * User profile controllers
 */

import { Request, Response } from 'express';
import { AuthService } from '@/services/auth';
import { requestLogger } from '@/lib/logger';
import { requireAuth } from '@/middlewares/auth';

/**
 * User profile page controller
 */
export const userProfileController = [
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      // Get current user details (already set in req.user by auth middleware)
      const user = (req as any).user;

      if (!user) {
        res.redirect('/login');
        return;
      }

      // Get additional user data if needed
      const userDetails = await AuthService.getUserProfile(context, user.id);

      res.render('pages/user-profile', {
        title: 'My Profile',
        user: userDetails || user,
        pageName: 'user-profile',
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to render user profile page');
      res.status(500).render('errors/500', {
        title: 'Error',
        error: 'Unable to load profile',
      });
    }
  }
];

/**
 * Update user profile controller (for future use)
 */
export const updateUserProfileController = [
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const user = (req as any).user;
      const { name, email, phone } = req.body;

      // Update user profile
      const updatedUser = await AuthService.updateUserProfile(context, user.id, {
        name,
        email, 
        phone,
      });

      res.json({
        success: true,
        user: updatedUser,
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to update user profile');
      res.status(500).json({
        success: false,
        message: 'Unable to update profile',
      });
    }
  }
];
