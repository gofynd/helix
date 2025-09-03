/**
 * Middleware to handle and ignore certain common bot/tool requests
 * Prevents unnecessary 404 logging for known patterns
 */

import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '@/lib/logger';
import { asyncHandler } from '@/middlewares/error';

// Patterns of URLs to ignore or handle silently
const IGNORED_PATTERNS = [
  /^\/\.well-known\//,                    // Well-known URIs (robots, security, etc.)
  /^\/apple-touch-icon/,                  // Apple device icons
  /^\/favicon\.ico$/,                     // Favicon requests
  /^\/robots\.txt$/,                      // Robots.txt
  /^\/sitemap\.xml$/,                     // Sitemap
  /^\/ads\.txt$/,                         // Ads.txt for advertising
  /^\/browserconfig\.xml$/,               // Microsoft browser config
  /^\/manifest\.json$/,                   // PWA manifest
  /^\/service-worker\.js$/,               // Service worker
  /\.php$/,                               // PHP files (bot scanning)
  /\.(asp|aspx|jsp|cgi)$/,               // Other server-side files
  /wp-(admin|content|includes)/,          // WordPress paths (bot scanning)
  /\/(admin|administrator|manager)\//,    // Admin paths (bot scanning)
];

// Chrome DevTools specific patterns
const CHROME_DEVTOOLS_PATTERNS = [
  /^\/\.well-known\/appspecific\/com\.chrome\.devtools/,
];

// Static asset patterns that should 404 silently
const MISSING_STATIC_PATTERNS = [
  /^\/static\/.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
];

/**
 * Middleware to handle ignored routes
 * Returns early for known bot/tool requests to avoid unnecessary processing
 */
export const ignoreRoutesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const path = req.path;
  
  // Check if this is a Chrome DevTools request
  if (CHROME_DEVTOOLS_PATTERNS.some(pattern => pattern.test(path))) {
    // Return minimal valid response for Chrome DevTools
    res.status(404).json({});
    return;
  }
  
  // Check if this should be completely ignored
  if (IGNORED_PATTERNS.some(pattern => pattern.test(path))) {
    // Return simple 404 without logging or processing
    res.status(404).send('Not Found');
    return;
  }
  
  // Check if this is a missing static asset
  if (MISSING_STATIC_PATTERNS.some(pattern => pattern.test(path))) {
    const logger = requestLogger(req.id);
    logger.debug({ path }, 'Missing static asset');
    res.status(404).send('Not Found');
    return;
  }
  
  // Special handling for common files
  switch (path) {
    case '/favicon.ico':
      res.status(204).end(); // No content
      return;
      
    case '/robots.txt':
      res.type('text/plain');
      res.send(`User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /products/
Allow: /categories/
Allow: /brands/

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
      return;
      
    case '/sitemap.xml':
      res.type('application/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${req.protocol}://${req.get('host')}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${req.protocol}://${req.get('host')}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${req.protocol}://${req.get('host')}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${req.protocol}://${req.get('host')}/brands</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
      return;
      
    default:
      // Continue to next middleware
      next();
  }
};

/**
 * Enhanced 404 handler with custom page rendering
 */
export const custom404Handler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;
    
    // Log the 404 (but at info level, not error)
    logger.info({ 
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent')
    }, '404 Not Found');
    
    // If it's an API request, return JSON
    if (req.path.startsWith('/api/') || req.accepts('json') && !req.accepts('html')) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `The requested resource ${req.path} was not found`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          traceId: req.id
        }
      });
      return;
    }
    
    // Get navigation for the 404 page
    let navigation = null;
    try {
      const ContentService = require('@/services/content').ContentService;
      navigation = await ContentService.Navigation.getNavigation(context);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch navigation for 404 page');
    }
    
    // Render the 404 page
    res.status(404).render('pages/404', {
      navigation,
      seo: {
        title: '404 - Page Not Found',
        description: 'The page you are looking for could not be found.',
        noindex: true
      },
      requestedUrl: req.originalUrl,
      message: null,
      showSearch: true,
      traceId: req.id,
      isProduction: process.env.NODE_ENV === 'production',
      req: {
        ...req,
        path: req.path || '/404'
      }
    });
  }
);


