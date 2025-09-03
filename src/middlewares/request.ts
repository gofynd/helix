/**
 * Request processing middlewares
 * 
 * Includes:
 * - Request ID generation and correlation
 * - Request logging
 * - Security headers
 * - Rate limiting
 * - Request parsing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { Config } from '@/lib/config';
import { requestLogger } from '@/lib/logger';

/**
 * Adds unique request ID for tracing
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  req.id = traceId;
  res.set('X-Trace-ID', traceId);
  next();
};

/**
 * Request logging middleware
 */
export const requestLogging = (req: Request, res: Response, next: NextFunction): void => {
  const logger = requestLogger(req.id);
  
  const startTime = Date.now();
  
  logger.info({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    referer: req.get('Referer'),
  }, 'Request started');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
    }, `Request completed: ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
  });

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
      contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "via.placeholder.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", Config.fyndApiUrl],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Compression middleware
 */
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
});

/**
 * Rate limiting middleware
 */
export const rateLimiting = rateLimit({
  windowMs: Config.rateLimitWindow,
  max: Config.rateLimitMax,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const logger = requestLogger(req.id);
    
    logger.warn({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    }, 'Rate limit exceeded');

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        traceId: req.id,
      },
    });
  },
});

/**
 * Request parsing middleware
 */
export const requestParsing = [
  // Parse JSON bodies
  (req: Request, res: Response, next: NextFunction) => {
    if (req.is('application/json')) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          req.body = body ? JSON.parse(body) : {};
          next();
        } catch (error) {
          const logger = requestLogger(req.id);
          logger.warn({ err: error }, 'Invalid JSON in request body');
          
          res.status(400).json({
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body',
              statusCode: 400,
              timestamp: new Date().toISOString(),
              traceId: req.id,
            },
          });
        }
      });
    } else {
      next();
    }
  },
];

/**
 * Request context middleware
 * Adds useful context to request object
 */
export const requestContext = (req: Request, _res: Response, next: NextFunction): void => {
  // Extract locale from headers or query params
  const acceptLanguage = req.get('Accept-Language');
  const queryLocale = req.query.locale as string;
  const locale = queryLocale || (acceptLanguage ? acceptLanguage.split(',')[0] : 'en');

  // Extract currency from query params or default
  const currency = (req.query.currency as string) || 'INR';

  // Extract important cookies for session and tracking
  const cookies = req.headers.cookie || '';
  const importantCookies = [
    'anonymous_id',
    'anonymous_user_id',
    'fc.session',
    'cc.session',
    'ajs_anonymous_id',
    'ajs_user_id'
  ];

  // Parse and filter important cookies
  const cookieMap = new Map<string, string>();
  cookies.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && importantCookies.includes(key)) {
      cookieMap.set(key, value || '');
    }
  });

  // Add to request context
  (req as any).context = {
    traceId: req.id,
    locale: locale.toLowerCase(),
    currency: currency.toUpperCase(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    isBot: /bot|crawler|spider/i.test(req.get('User-Agent') || ''),
    isMobile: /mobile/i.test(req.get('User-Agent') || ''),
    cookies: cookieMap,
    cookieString: Array.from(cookieMap).map(([k, v]) => `${k}=${v}`).join('; '),
  };

  next();
};

/**
 * Health check middleware
 */
export const healthCheck = (_req: Request, res: Response): void => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
  };

  res.json(health);
};
