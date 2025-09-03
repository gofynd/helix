/**
 * Cookie management middleware
 * Handles cookie forwarding to GraphQL and setting response cookies
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '@/lib/logger';

/**
 * Important cookies that should be forwarded to GraphQL
 */
export const IMPORTANT_COOKIES = [
  'anonymous_id',
  'anonymous_user_id',
  'fc.session',
  'cc.session',
  'ajs_anonymous_id',
  'ajs_user_id',
];

/**
 * Middleware to handle GraphQL response cookies
 * This should be called after GraphQL operations to set any cookies received
 */
export const handleGraphQLCookies = (req: Request, res: Response, next: NextFunction): void => {
  const context = (req as any).context;
  
  // Check if we have response cookies from GraphQL
  if (context?.responseCookies && Array.isArray(context.responseCookies)) {
    const logger = requestLogger(req.id);
    
    context.responseCookies.forEach((cookieString: string) => {
      try {
        // Parse and set each cookie
        if (cookieString) {
          // Split multiple cookies if present
          const cookies = cookieString.split(',').map(c => c.trim());
          
          cookies.forEach(cookie => {
            // Parse cookie attributes
            const parts = cookie.split(';').map(p => p.trim());
            const [nameValue, ...attributes] = parts;
            
            if (nameValue) {
              const [name, value] = nameValue.split('=');
              
              // Only set important cookies
              if (IMPORTANT_COOKIES.includes(name)) {
                // Parse cookie options
                const options: any = {
                  httpOnly: true, // Default to httpOnly for security
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax' as const,
                };
                
                // Parse attributes
                attributes.forEach(attr => {
                  const [key, val] = attr.split('=');
                  const lowerKey = key.toLowerCase();
                  
                  if (lowerKey === 'max-age') {
                    options.maxAge = parseInt(val) * 1000; // Convert to milliseconds
                  } else if (lowerKey === 'expires') {
                    options.expires = new Date(val);
                  } else if (lowerKey === 'domain') {
                    options.domain = val;
                  } else if (lowerKey === 'path') {
                    options.path = val;
                  } else if (lowerKey === 'samesite') {
                    options.sameSite = val.toLowerCase() as 'lax' | 'strict' | 'none';
                  } else if (lowerKey === 'secure') {
                    options.secure = true;
                  } else if (lowerKey === 'httponly') {
                    options.httpOnly = true;
                  }
                });
                
                // Set the cookie
                res.cookie(name, value || '', options);
                
                logger.debug({ 
                  cookieName: name, 
                  hasValue: !!value,
                  options 
                }, 'Set cookie from GraphQL response');
              }
            }
          });
        }
      } catch (error) {
        logger.error({ err: error, cookieString }, 'Failed to parse GraphQL response cookie');
      }
    });
    
    // Clear response cookies from context after processing
    context.responseCookies = [];
  }
  
  next();
};

/**
 * Express middleware to ensure cookies are properly forwarded
 * This should be added early in the middleware chain
 */
export const cookieForwardingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Ensure cookie parser has run
  if (!req.headers.cookie) {
    next();
    return;
  }
  
  const logger = requestLogger(req.id);
  
  // Parse cookies if not already parsed
  const cookies = parseCookies(req.headers.cookie);
  
  // Filter important cookies
  const importantCookies: Record<string, string> = {};
  let hasImportantCookies = false;
  
  IMPORTANT_COOKIES.forEach(cookieName => {
    if (cookies[cookieName]) {
      importantCookies[cookieName] = cookies[cookieName];
      hasImportantCookies = true;
    }
  });
  
  if (hasImportantCookies) {
    // Store in request for later use
    (req as any).importantCookies = importantCookies;
    
    logger.debug({ 
      cookieNames: Object.keys(importantCookies) 
    }, 'Important cookies found in request');
  }
  
  next();
};

/**
 * Parse cookie string into object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(value || '');
    }
  });
  
  return cookies;
}

/**
 * Wraps a controller to automatically handle GraphQL cookies
 */
export function withCookieHandling<T extends Function>(controller: T): T {
  return (async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Execute the controller
      await controller(req, res, next);
      
      // Handle any GraphQL cookies after controller execution
      const context = (req as any).context;
      if (context?.responseCookies && context.responseCookies.length > 0) {
        handleGraphQLCookies(req, res, () => {});
      }
    } catch (error) {
      next(error);
    }
  }) as unknown as T;
}
