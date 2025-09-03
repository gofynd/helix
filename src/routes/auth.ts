/**
 * Authentication routes
 */

import { Router } from 'express';
import {
  loginPageController,
  sendOTPController,
  verifyOTPController,
  resendOTPController,
  loginWithPasswordController,
  logoutController,
  getCurrentUserController,
} from '@/controllers/auth';

export const authRouter = Router();

// Login page
authRouter.get('/login', loginPageController);

// API endpoints for authentication
authRouter.post('/api/auth/send-otp', sendOTPController);
authRouter.post('/api/auth/verify-otp', verifyOTPController);
authRouter.post('/api/auth/resend-otp', resendOTPController);
authRouter.post('/api/auth/login-password', loginWithPasswordController);
authRouter.post('/api/auth/logout', logoutController);
authRouter.get('/api/auth/current-user', getCurrentUserController);

// Logout route (GET for browser)
authRouter.get('/logout', logoutController);
