/**
 * Authentication middleware
 * Handles user authentication checks and session management
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth';
import { requestLogger } from '@/lib/logger';

/**
 * Middleware to check if user is authenticated and add user to res.locals
 */
export async function userMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const logger = requestLogger(req.id);
  const context = (req as any).context;

  try {
    // Check if user is authenticated
    const user = await AuthService.getCurrentUser(context);
    
    // Add user to res.locals for templates
    res.locals.user = user;
    res.locals.isAuthenticated = !!user;
    
    // Add user to request for controllers
    (req as any).user = user;
    
    next();
  } catch (error) {
    logger.error({ err: error }, 'Failed to get user in middleware');
    // Continue without user
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    next();
  }
}

/**
 * Middleware to require authentication
 * Redirects to login if not authenticated
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;
  
  if (!user) {
    const redirectUrl = encodeURIComponent(req.originalUrl);
    res.redirect(`/login?redirectUrl=${redirectUrl}`);
    return;
  }
  
  next();
}

/**
 * Middleware to require no authentication
 * Redirects to home if already authenticated
 */
export function requireGuest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;
  
  if (user) {
    const redirectUrl = req.query.redirectUrl as string || '/';
    res.redirect(redirectUrl);
    return;
  }
  
  next();
}
