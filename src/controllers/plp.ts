/**
 * Product Listing Page (PLP) controller
 * 
 * Handles product listing with search, filters, sorting, and pagination
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogService } from '@/services/catalog';
import { ContentService } from '@/services/content';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { asyncHandler, handleValidationError } from '@/middlewares/error';

/**
 * PLP query parameters schema
 */
const plpQuerySchema = z.object({
  search: z.string().optional(),
  f: z.string().optional(),
  sortOn: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  filters: z.coerce.boolean().optional().default(true),
});

/**
 * PLP page data interface
 */
interface PLPPageData {
  products: any[];
  filters: any[];
  sortOptions: any[];
  pagination: any;
  searchQuery: string | undefined;
  currentFilters: Record<string, any>;
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
 * Product listing controller
 */
export const plpController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Rendering product listing page');

    try {
      // Validate query parameters
      const params = plpQuerySchema.parse(req.query);
      
      // Fetch data in parallel
      const [productsData, navigation] = await Promise.all([
        // Search or list products based on query
        params.search 
          ? CatalogService.Product.searchProducts(params.search, {
              f: params.f,
              filters: params.filters,
              sortOn: params.sortOn,
              pageSize: params.pageSize,
              pageNo: params.page,
            }, context)
          : CatalogService.Product.getProducts({
              search: params.search,
              f: params.f,
              filters: params.filters,
              sortOn: params.sortOn,
              pageSize: params.pageSize,
              pageNo: params.page,
            }, context),
        ContentService.Navigation.getNavigation(context),
      ]);

      // Parse current filters from f parameter
      const currentFilters = parseFilters(params.f);

      // Build breadcrumbs
      const breadcrumbs = buildBreadcrumbs(params.search, currentFilters);

      // Prepare SEO data
      const seo = buildSEO(params, productsData, req);

      // Prepare template data
      const templateData: PLPPageData = {
        products: productsData?.items || [],
        filters: productsData?.filters || [],
        sortOptions: productsData?.sort_on || [],
        pagination: productsData?.page || {},
        searchQuery: params.search,
        currentFilters,
        navigation,
        seo,
        breadcrumbs,
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/products'
        },
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 180, // 3 minutes for dynamic content
        staleWhileRevalidate: 360,
        public: true,
      });

      // Render PLP template
      res.render('pages/plp', templateData);

      logger.info({
        productsCount: productsData?.items?.length || 0,
        totalProducts: productsData?.page?.item_total || 0,
        filtersCount: productsData?.filters?.length || 0,
        currentPage: params.page,
        searchQuery: params.search,
      }, 'PLP rendered successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to render PLP');
      throw error;
    }
  }
);

/**
 * Product listing API endpoint
 */
export const plpApiController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Fetching PLP data via API');

    try {
      const params = plpQuerySchema.parse(req.query);
      
      const productsData = params.search 
        ? await CatalogService.Product.searchProducts(params.search, {
            f: params.f,
            filters: params.filters,
            sortOn: params.sortOn,
            pageSize: params.pageSize,
            pageNo: params.page,
          }, context)
        : await CatalogService.Product.getProducts({
            search: params.search,
            f: params.f,
            filters: params.filters,
            sortOn: params.sortOn,
            pageSize: params.pageSize,
            pageNo: params.page,
          }, context);

      const data = {
        ...productsData,
        currentFilters: parseFilters(params.f),
        searchQuery: params.search,
        timestamp: new Date().toISOString(),
      };

      HttpCacheControl.setHeaders(res, {
        maxAge: 180,
        public: true,
      });

      res.json(data);

      logger.info('PLP API response sent');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to fetch PLP data');
      throw error;
    }
  }
);

/**
 * Parse filters from query string
 */
function parseFilters(filtersString?: string): Record<string, any> {
  if (!filtersString) return {};
  
  try {
    const filters: Record<string, any> = {};
    const pairs = filtersString.split('::');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) {
        if (filters[key]) {
          if (Array.isArray(filters[key])) {
            filters[key].push(value);
          } else {
            filters[key] = [filters[key], value];
          }
        } else {
          filters[key] = value;
        }
      }
    });
    
    return filters;
  } catch {
    return {};
  }
}

/**
 * Build breadcrumbs for navigation
 */
function buildBreadcrumbs(
  searchQuery?: string, 
  filters: Record<string, any> = {}
): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' }
  ];

  if (searchQuery) {
    breadcrumbs.push({
      name: `Search: "${searchQuery}"`,
      url: `/products?q=${encodeURIComponent(searchQuery)}`
    });
  } else {
    breadcrumbs.push({
      name: 'All Products',
      url: '/products'
    });
  }

  // Add filter breadcrumbs
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'string') {
      breadcrumbs.push({
        name: `${key}: ${value}`,
        url: '#' // Would be filter removal URL in real implementation
      });
    }
  });

  return breadcrumbs;
}

/**
 * Build SEO metadata
 */
function buildSEO(
  params: z.infer<typeof plpQuerySchema>,
  productsData: any,
  req: Request
) {
  const baseTitle = 'Products';
  const totalProducts = productsData?.page?.item_total || 0;
  
  let title = baseTitle;
  let description = `Discover ${totalProducts} amazing products at great prices.`;

  if (params.search) {
    title = `Search: "${params.search}" - ${totalProducts} Results`;
    description = `Found ${totalProducts} products for "${params.search}". Shop now for the best deals.`;
  }

  return {
    title,
    description,
    canonical: `${req.protocol}://${req.get('host')}${req.path}`,
  };
}
