/**
 * Home page controller
 * 
 * Handles home page rendering with content sections, banners, and navigation
 */

import { Request, Response } from 'express';
import { ContentService } from '@/services/content';
import { CatalogService } from '@/services/catalog';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { asyncHandler } from '@/middlewares/error';

/**
 * Home page data interface
 */
interface HomePageData {
  homeContent: any;
  navigation: any;
  featuredProducts?: any;
  categories?: any;
  banners?: any;
  seo: {
    title: string;
    description: string;
    canonical: string;
  };
  req?: any;
}

/**
 * Home page controller
 */
export const homeController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info('Rendering home page');

    try {
      // Fetch data in parallel for better performance
      const [homeContent, navigation, featuredProducts, categories] = await Promise.all([
        ContentService.Home.getHomeContent(context),
        ContentService.Navigation.getNavigation(context),
        // Get featured products (first 8 products)
        CatalogService.Product.getProducts({
          pageSize: 8,
          sortOn: 'popular',
        }, context),
        // Get main categories
        CatalogService.Category.getCategories(undefined, context),
      ]);

      // Prepare SEO data
      const seo = {
        title: homeContent?.seo?.title || 'Fynd Storefront - Shop the Latest Trends',
        description: homeContent?.seo?.description || 'Discover amazing products at great prices. Shop now for the latest fashion, electronics, and more.',
        canonical: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      };

      // Prepare template data
      const templateData: HomePageData = {
        homeContent,
        navigation,
        featuredProducts: featuredProducts?.items || [],
        categories: categories?.items?.slice(0, 12) || [], // Show first 12 categories
        seo,
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/'
        },
      };

      // Set cache headers for home page
      HttpCacheControl.setHeaders(res, {
        maxAge: 300, // 5 minutes
        staleWhileRevalidate: 600, // 10 minutes
        public: true,
      });

      // Render home page template
      res.render('pages/home', templateData);

      logger.info({
        sectionsCount: homeContent?.sections?.length || 0,
        productsCount: featuredProducts?.items?.length || 0,
        categoriesCount: categories?.items?.length || 0,
      }, 'Home page rendered successfully');

    } catch (error) {
      logger.error({ err: error }, 'Failed to render home page');
      throw error;
    }
  }
);

/**
 * Home page data API endpoint
 */
export const homeDataController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info('Fetching home page data via API');

    try {
      const [homeContent, featuredProducts] = await Promise.all([
        ContentService.Home.getHomeContent(context),
        CatalogService.Product.getProducts({
          pageSize: 8,
          sortOn: 'popular',
        }, context),
      ]);

      const data = {
        homeContent,
        featuredProducts: featuredProducts?.items || [],
        timestamp: new Date().toISOString(),
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 300,
        public: true,
      });

      res.json(data);

      logger.info('Home page data API response sent');

    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch home page data');
      throw error;
    }
  }
);
