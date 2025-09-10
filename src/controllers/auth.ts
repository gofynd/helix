/**
 * Authentication controller
 * Handles login, OTP verification, and logout operations
 */

import { Request, Response } from 'express';
import { AuthService } from '@/services/auth';
import { ContentService } from '@/services/content';
import { asyncHandler } from '@/middlewares/error';
import { requestLogger } from '@/lib/logger';
import { handleGraphQLCookies } from '@/middlewares/cookies';

/**
 * Login page controller
 */
export const loginPageController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('Rendering login page');

      // Get redirect URL from query params
      const redirectUrl = req.query.redirectUrl as string || '/';

      // Check if user is already logged in
      const user = await AuthService.getCurrentUser(context);
      if (user) {
        logger.info('User already logged in, redirecting');
        res.redirect(redirectUrl);
        return;
      }

      // Fetch navigation
      const navigation = await ContentService.Navigation.getNavigation(context);

      // Prepare SEO data
      const seo = {
        title: 'Login - ' + (res.locals.store?.name || 'Feeling Perfume'),
        description: 'Login to your account to access exclusive deals and track your orders',
        keywords: 'login, sign in, account',
        canonicalUrl: `${req.protocol}://${req.get('host')}/login`,
      };

      // Template data
      const templateData = {
        navigation,
        seo,
        redirectUrl,
        storeName: res.locals.store?.name || 'Feeling Perfume',
        req: {
          ...req,
          path: req.path || '/login'
        }
      };

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      // Render the login page
      res.render('pages/login', templateData);

      logger.info('Login page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render login page');
      throw error;
    }
  }
);

/**
 * Send OTP controller
 */
export const sendOTPController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const { mobile, countryCode } = req.body;

      if (!mobile) {
        res.status(400).json({
          success: false,
          message: 'Mobile number is required',
        });
        return;
      }

      logger.info({ mobile, countryCode }, 'Sending OTP');

      const result = await AuthService.sendOTPForLogin(
        mobile,
        countryCode || '91',
        context
      );

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      res.json({
        success: result.success,
        message: result.message,
        data: {
          request_id: result.request_id,
          resend_timer: result.resend_timer,
          resend_token: result.resend_token,
          user_exists: result.user_exists,
        },
      });

      logger.info('OTP sent successfully');

    } catch (error: any) {
      logger.error({ err: error }, 'Failed to send OTP');
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send OTP',
      });
    }
  }
);

/**
 * Verify OTP controller
 */
export const verifyOTPController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const { requestId, otp } = req.body;

      if (!requestId || !otp) {
        res.status(400).json({
          success: false,
          message: 'Request ID and OTP are required',
        });
        return;
      }

      logger.info({ requestId }, 'Verifying OTP');

      const result = await AuthService.verifyOTP(requestId, otp, context);

      if (!result || (result.user_exists === false && !result.register_token)) {
        res.status(400).json({
          success: false,
          message: 'Failed to verify OTP. Please try again.',
        });
        return;
      }

      if (result.user) {
        // Set user session or token (you may want to implement JWT here)
        (req as any).session = (req as any).session || {};
        (req as any).session.user = result.user;
        (req as any).session.token = result.register_token;
      }

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.register_token,
          user_exists: result.user_exists,
        },
      });

      logger.info('OTP verified successfully');

    } catch (error: any) {
      logger.error({ err: error }, 'Failed to verify OTP');
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to verify OTP',
      });
    }
  }
);

/**
 * Resend OTP controller
 */
export const resendOTPController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const { mobile, countryCode, token } = req.body;

      if (!mobile || !token) {
        res.status(400).json({
          success: false,
          message: 'Mobile number and token are required',
        });
        return;
      }

      logger.info({ mobile, countryCode }, 'Resending OTP');

      const result = await AuthService.resendOTP(
        mobile,
        countryCode || '91',
        token,
        context
      );

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      res.json({
        success: result.success,
        message: result.message,
        data: {
          request_id: result.request_id,
          resend_timer: result.resend_timer,
          resend_token: result.resend_token,
        },
      });

      logger.info('OTP resent successfully');

    } catch (error: any) {
      logger.error({ err: error }, 'Failed to resend OTP');
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to resend OTP',
      });
    }
  }
);

/**
 * Login with password controller
 */
export const loginWithPasswordController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
        return;
      }

      logger.info({ username }, 'Login with password attempt');

      const result = await AuthService.loginWithPassword(
        username,
        password,
        context
      );

      if (result.user) {
        // Set user session or token
        (req as any).session = (req as any).session || {};
        (req as any).session.user = result.user;
        (req as any).session.token = result.register_token;
      }

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.register_token,
        },
      });

      logger.info('Password login successful');

    } catch (error: any) {
      logger.error({ err: error }, 'Failed to login with password');
      res.status(400).json({
        success: false,
        message: error.message || 'Invalid username or password',
      });
    }
  }
);

/**
 * Logout controller
 */
export const logoutController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('User logout attempt');

      const success = await AuthService.logout(context);

      // Clear session
      if ((req as any).session) {
        (req as any).session = null;
      }

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      if (req.accepts('html')) {
        res.redirect('/login');
      } else {
        res.json({
          success,
          message: success ? 'Logged out successfully' : 'Failed to logout',
        });
      }

      logger.info('User logged out successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to logout');
      if (req.accepts('html')) {
        res.redirect('/');
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to logout',
        });
      }
    }
  }
);

/**
 * Get current user controller (API endpoint)
 */
export const getCurrentUserController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      const user = await AuthService.getCurrentUser(context);

      res.json({
        success: true,
        data: {
          user,
          isAuthenticated: !!user,
        },
      });

    } catch (error) {
      logger.error({ err: error }, 'Failed to get current user');
      res.status(500).json({
        success: false,
        message: 'Failed to get user information',
      });
    }
  }
);
