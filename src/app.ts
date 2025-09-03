/**
 * Express application setup with Nunjucks templating
 * 
 * Features:
 * - Nunjucks templating engine with security and performance optimizations
 * - Middleware stack with proper ordering
 * - Route registration
 * - Error handling
 * - Static file serving
 */

import express, { Application } from 'express';
import nunjucks from 'nunjucks';
import path from 'path';
import { Config } from './lib/config';
import { 
  requestId, 
  requestLogging, 
  securityHeaders, 
  compressionMiddleware, 
  rateLimiting,
  requestContext,
  healthCheck,
} from './middlewares/request';
import { errorHandler, notFoundHandler } from './middlewares/error';
import { cache } from './lib/cache';
import { getCSSFilesForPage, getPageNameFromRoute } from './lib/css-helper';

// Import routes
import { homeRouter } from './routes/home';
import { plpRouter } from './routes/plp';
import { pdpRouter } from './routes/pdp'; 
import { categoryRouter } from './routes/category';
import { categoriesRouter } from './routes/categories';
import { brandsRouter } from './routes/brands';

/**
 * Nunjucks template filters and globals
 */
function setupNunjucksFilters(env: nunjucks.Environment): void {
  // Price formatting filter
  env.addFilter('price', (amount: number, currency: string = 'INR') => {
    if (typeof amount !== 'number') return amount;
    
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    
    return formatter.format(amount);
  });

  // Date formatting filter
  env.addFilter('date', (date: string | Date, format: string = 'short') => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (format) {
      case 'short':
        options.dateStyle = 'short';
        break;
      case 'medium':
        options.dateStyle = 'medium';
        break;
      case 'long':
        options.dateStyle = 'long';
        break;
      case 'relative':
        return new Intl.RelativeTimeFormat('en').format(
          Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          'day'
        );
      default:
        options.dateStyle = 'short';
    }
    
    return new Intl.DateTimeFormat('en', options).format(d);
  });

  // Image srcset filter for responsive images
  env.addFilter('srcset', (imageUrl: string, sizes: number[] = [320, 640, 768, 1024, 1280]) => {
    if (!imageUrl) return '';
    
    return sizes
      .map(size => `${imageUrl}?w=${size} ${size}w`)
      .join(', ');
  });

  // Truncate text filter
  env.addFilter('truncate', (text: string, length: number = 100, suffix: string = '...') => {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + suffix;
  });

  // Slug filter
  env.addFilter('slug', (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  });

  // JSON filter for safe JSON output
  env.addFilter('json', (obj: any) => {
    return JSON.stringify(obj);
  });

  // Number formatting filter
  env.addFilter('number_format', (number: number | string) => {
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
  });

  // Title case filter
  env.addFilter('title', (text: string) => {
    if (!text) return '';
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  });

  // Raw HTML filter - bypasses autoescaping
  env.addFilter('raw', function(text: string) {
    return new (nunjucks as any).runtime.SafeString(text || '');
  });

  // Math functions for templates
  env.addGlobal('max', Math.max);
  env.addGlobal('min', Math.min);
  env.addGlobal('ceil', Math.ceil);
  env.addGlobal('floor', Math.floor);
  env.addGlobal('round', Math.round);

  // Utility functions for templates
  env.addGlobal('buildPaginationUrl', (page: number, currentParams?: any) => {
    const params = new URLSearchParams(currentParams || {});
    params.set('page', page.toString());
    return params.toString();
  });

  env.addGlobal('range', (start: number, end: number) => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  // Add global variables
  env.addGlobal('env', Config.isDevelopment ? 'development' : 'production');
  env.addGlobal('version', process.env.npm_package_version || '1.0.0');
  env.addGlobal('cacheStats', () => cache.getStats());
  
  // CSS loading helper
  env.addGlobal('getCSSFiles', (req: any) => {
    const pageName = getPageNameFromRoute(req.path);
    return getCSSFilesForPage(pageName);
  });
}

/**
 * Creates and configures Express application
 */
export function createApp(): Application {
  const app = express();

  // Trust proxy if configured
  if (Config.trustProxy) {
    app.set('trust proxy', true);
  }

  // Configure Nunjucks
  const viewsPath = path.join(__dirname, 'views');
  const nunjucksEnv = nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    watch: Config.isDevelopment,
    noCache: Config.isDevelopment,
    throwOnUndefined: Config.isDevelopment,
  });

  // Setup Nunjucks filters and globals
  setupNunjucksFilters(nunjucksEnv);

  // Set view engine
  app.set('view engine', 'njk');
  app.set('views', viewsPath);

  // Core middleware (order matters!)
  app.use(requestId);
  app.use(requestLogging);
  app.use(securityHeaders);
  app.use(compressionMiddleware);
  
  // Rate limiting (skip in development)
  if (!Config.isDevelopment) {
    app.use(rateLimiting);
  }
  
  app.use(requestContext);

  // Static files
  app.use('/static', express.static(path.join(__dirname, '..', 'public'), {
    maxAge: Config.isProduction ? '1y' : '0',
    etag: true,
    lastModified: true,
  }));

  // Health check endpoint
  app.get('/health', healthCheck);

  // API routes
  app.use('/', homeRouter);
  app.use('/products', plpRouter);
  app.use('/product', pdpRouter);
  app.use('/category', categoryRouter);
  app.use('/categories', categoriesRouter);
  app.use('/brands', brandsRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Application metadata
 */
export const appInfo = {
  name: 'Fynd Storefront SSR',
  version: process.env.npm_package_version || '1.0.0',
  description: 'Production-ready Express SSR storefront powered by Fynd Platform Storefront GraphQL',
  author: 'Fynd',
};
