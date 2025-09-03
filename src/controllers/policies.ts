/**
 * Policy pages controller
 * Handles legal information pages: terms & conditions, return policy, shipping policy
 */

import { Request, Response } from 'express';
import { ContentService } from '@/services/content';
import { asyncHandler } from '@/middlewares/error';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { handleGraphQLCookies } from '@/middlewares/cookies';

/**
 * Terms and Conditions page controller
 */
export const termsAndConditionsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('Fetching terms and conditions page');

      // Fetch navigation and legal information
      const [navigation, legalInfo] = await Promise.all([
        ContentService.Navigation.getNavigation(context),
        ContentService.Application.getLegalInformation(context)
      ]);

      // Prepare breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Terms & Conditions', url: '/terms-and-conditions' }
      ];

      // Prepare SEO data
      const seo = {
        title: 'Terms & Conditions - ' + (res.locals.store?.name || 'Fynd Store'),
        description: 'Read our terms and conditions for using our website and purchasing our products. Learn about product availability, pricing, payments, and more.',
        keywords: 'terms and conditions, terms of service, legal terms, website terms',
        canonicalUrl: `${req.protocol}://${req.get('host')}/terms-and-conditions`
      };

      // Template data
      const templateData = {
        navigation,
        seo,
        breadcrumbs,
        pageTitle: 'Terms & Conditions',
        content: legalInfo?.tnc || legalInfo?.policy || '',
        lastUpdated: legalInfo?.updated_at,
        req: {
          ...req,
          path: req.path || '/terms-and-conditions'
        }
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 7200, // 2 hours for legal pages
        public: true,
      });

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      // Render the policy page
      res.render('pages/policy', templateData);

      logger.info('Terms and conditions page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render terms and conditions page');
      throw error;
    }
  }
);

/**
 * Return Policy page controller
 */
export const returnPolicyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('Fetching return policy page');

      // Fetch navigation and legal information
      const [navigation, legalInfo] = await Promise.all([
        ContentService.Navigation.getNavigation(context),
        ContentService.Application.getLegalInformation(context)
      ]);

      // Prepare breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Return Policy', url: '/return-policy' }
      ];

      // Prepare SEO data
      const seo = {
        title: 'Return & Refund Policy - ' + (res.locals.store?.name || 'Fynd Store'),
        description: 'Learn about our return and refund policy. We do not offer returns or exchanges once the order has been delivered. Report issues within 48 hours.',
        keywords: 'return policy, refund policy, returns, refunds, exchange policy',
        canonicalUrl: `${req.protocol}://${req.get('host')}/return-policy`
      };

      // Template data
      const templateData = {
        navigation,
        seo,
        breadcrumbs,
        pageTitle: 'Return & Refund Policy',
        content: legalInfo?.returns || '',
        lastUpdated: legalInfo?.updated_at,
        req: {
          ...req,
          path: req.path || '/return-policy'
        }
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 7200, // 2 hours for legal pages
        public: true,
      });

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      // Render the policy page
      res.render('pages/policy', templateData);

      logger.info('Return policy page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render return policy page');
      throw error;
    }
  }
);

/**
 * Shipping Policy page controller
 */
export const shippingPolicyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('Fetching shipping policy page');

      // Fetch navigation and legal information
      const [navigation, legalInfo] = await Promise.all([
        ContentService.Navigation.getNavigation(context),
        ContentService.Application.getLegalInformation(context)
      ]);

      // Prepare breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Shipping & Delivery', url: '/shipping-policy' }
      ];

      // Prepare SEO data
      const seo = {
        title: 'Shipping & Delivery Policy - ' + (res.locals.store?.name || 'Fynd Store'),
        description: 'Learn about our shipping and delivery options. We offer standard and express shipping with varying delivery timelines based on destination.',
        keywords: 'shipping policy, delivery policy, shipping information, delivery times',
        canonicalUrl: `${req.protocol}://${req.get('host')}/shipping-policy`
      };

      // Template data
      const templateData = {
        navigation,
        seo,
        breadcrumbs,
        pageTitle: 'Shipping & Delivery',
        content: legalInfo?.shipping || '',
        lastUpdated: legalInfo?.updated_at,
        req: {
          ...req,
          path: req.path || '/shipping-policy'
        }
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 7200, // 2 hours for legal pages
        public: true,
      });

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      // Render the policy page
      res.render('pages/policy', templateData);

      logger.info('Shipping policy page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render shipping policy page');
      throw error;
    }
  }
);

/**
 * Privacy Policy page controller
 */
export const privacyPolicyController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    try {
      logger.info('Fetching privacy policy page');

      // Fetch navigation and legal information
      const [navigation, legalInfo] = await Promise.all([
        ContentService.Navigation.getNavigation(context),
        ContentService.Application.getLegalInformation(context)
      ]);

      // Prepare breadcrumbs
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Privacy Policy', url: '/privacy-policy' }
      ];

      // Prepare SEO data
      const seo = {
        title: 'Privacy Policy - ' + (res.locals.store?.name || 'Fynd Store'),
        description: 'Read our privacy policy to understand how we collect, use, and protect your personal information.',
        keywords: 'privacy policy, data protection, personal information, privacy',
        canonicalUrl: `${req.protocol}://${req.get('host')}/privacy-policy`
      };

      // Template data
      const templateData = {
        navigation,
        seo,
        breadcrumbs,
        pageTitle: 'Privacy Policy',
        content: legalInfo?.policy || '',
        lastUpdated: legalInfo?.updated_at,
        req: {
          ...req,
          path: req.path || '/privacy-policy'
        }
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 7200, // 2 hours for legal pages
        public: true,
      });

      // Handle GraphQL response cookies
      handleGraphQLCookies(req, res, () => {});

      // Render the policy page
      res.render('pages/policy', templateData);

      logger.info('Privacy policy page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render privacy policy page');
      throw error;
    }
  }
);
