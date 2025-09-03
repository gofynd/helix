/**
 * Brands listing page controller
 * 
 * Handles brands listing with pagination and search
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogService } from '@/services/catalog';
import { NavigationService } from '@/services/content';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { asyncHandler, handleValidationError } from '@/middlewares/error';

/**
 * Brands query parameters schema
 */
const brandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  search: z.string().optional(),
});

/**
 * Brands page data interface
 */
interface BrandsPageData {
  brands: any[];
  pagination: any;
  searchQuery: string | undefined;
  navigation: any;
  seo: {
    title: string;
    description: string;
    canonical: string;
  };
  breadcrumbs: Array<{
    name: string;
    url: string;
  }>;
  req?: any;
}

/**
 * Brands listing controller
 */
export const brandsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Rendering brands page');

    try {
      // Validate query parameters
      const params = brandsQuerySchema.parse(req.query);
      
      // Fetch data in parallel
      const [brandsData, navigation] = await Promise.all([
        CatalogService.Brand.getBrands({
          pageNo: params.page,
        }, context),
        NavigationService.getNavigation(context),
      ]);

      // Build breadcrumbs
      const breadcrumbs = buildBreadcrumbs(params.search);

      // Prepare SEO data
      const seo = buildSEO(params, brandsData, req);

      // Prepare template data
      const templateData: BrandsPageData = {
        brands: brandsData?.items || [],
        pagination: brandsData?.page || {},
        searchQuery: params.search,
        navigation,
        seo,
        breadcrumbs,
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/brands'
        },
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 300, // 5 minutes for brands listing
        staleWhileRevalidate: 600,
        public: true,
      });

      // Render brands template
      res.render('pages/brands', templateData);

      logger.info('Brands page rendered successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to render brands page');
      throw error;
    }
  }
);

/**
 * Brands API endpoint
 */
export const brandsApiController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Fetching brands data via API');

    try {
      const params = brandsQuerySchema.parse(req.query);
      
      const brandsData = await CatalogService.Brand.getBrands({
        pageNo: params.page,
      }, context);

      const data = {
        ...brandsData,
        searchQuery: params.search,
        timestamp: new Date().toISOString(),
      };

      HttpCacheControl.setHeaders(res, {
        maxAge: 300,
        public: true,
      });

      res.json(data);

      logger.info('Brands API response sent');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to fetch brands data');
      throw error;
    }
  }
);

/**
 * Build breadcrumbs for brands page
 */
function buildBreadcrumbs(searchQuery?: string): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Brands', url: '/brands' }
  ];

  if (searchQuery) {
    breadcrumbs.push({
      name: `Search: "${searchQuery}"`,
      url: `/brands?search=${encodeURIComponent(searchQuery)}`
    });
  }

  return breadcrumbs;
}

/**
 * Build SEO data for brands page
 */
function buildSEO(
  params: { page: number; search?: string },
  brandsData: any,
  req: Request
): { title: string; description: string; canonical: string } {
  const totalBrands = brandsData?.page?.item_total || 0;
  
  let title = `Brands - Page ${params.page}`;
  let description = `Discover ${totalBrands} amazing brands. Shop from your favorite brands and discover new ones.`;

  if (params.search) {
    title = `Search: "${params.search}" - Brands`;
    description = `Found brands matching "${params.search}". Discover products from your favorite brands.`;
  }

  const canonical = `${req.protocol}://${req.get('host')}${req.path}`;

  return { title, description, canonical };
}
