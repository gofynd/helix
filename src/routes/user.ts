/**
 * User profile routes
 */

import { Router } from 'express';
import {
  userProfileController,
  updateUserProfileController,
} from '@/controllers/user';

export const userRouter = Router();

// User profile page
userRouter.get('/profile', userProfileController);

// API endpoint to update user profile
userRouter.post('/api/profile/update', updateUserProfileController);
