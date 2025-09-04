/**
 * Application configuration middleware
 * Injects storefront configuration data into all views
 */

import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '@/services/application';

/**
 * Middleware to inject application configuration into res.locals
 * This makes the configuration available to all Nunjucks templates
 */
export async function applicationConfigMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get request context for caching
    const context = {
      traceId: (req as any).id,
      headers: req.headers,
    };

    // Fetch application configuration
    const appConfig = await ApplicationService.getApplicationConfiguration(context);
    
    // Extract commonly used values for convenience
    const storeName = appConfig.basic_details?.name || appConfig.app_details?.name || 'Fynd Storefront';
    const storeDescription = appConfig.basic_details?.description || appConfig.app_details?.description || '';
    const copyrightText = appConfig.contact_info?.copyright_text || `© ${new Date().getFullYear()} Fynd. All rights reserved.`;
    const languages = appConfig.languages || [{ code: 'en', name: 'English' }];
    const isActive = appConfig.app_details?.is_active !== false;

    // Inject into res.locals for template access
    res.locals.appConfig = appConfig;
    res.locals.store = {
      name: storeName,
      description: storeDescription,
      copyrightText,
      languages,
      isActive,
      // Add more commonly accessed properties here
      slug: appConfig.basic_details?.slug || appConfig.app_details?.slug || '',
      companyId: appConfig.basic_details?.company_id || appConfig.app_details?.company_id || null,
    };

    next();
  } catch (error) {
    console.error('Failed to load application configuration:', error);
    
    // Provide default values on error to prevent template failures
    res.locals.appConfig = {};
    res.locals.store = {
      name: 'Fynd Storefront',
      description: 'Modern eCommerce storefront powered by Fynd Platform',
      copyrightText: `© ${new Date().getFullYear()} Fynd. All rights reserved.`,
      languages: [{ code: 'en', name: 'English' }],
      isActive: true,
      slug: '',
      companyId: null,
    };
    
    next();
  }
}

/**
 * Helper middleware to refresh application configuration cache
 * This can be called via an admin endpoint when configuration is updated
 */
export function refreshApplicationConfig(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    ApplicationService.clearCache();
    res.json({ success: true, message: 'Application configuration cache cleared' });
  } catch (error) {
    next(error);
  }
}
