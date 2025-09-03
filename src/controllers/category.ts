/**
 * Category page controller
 * 
 * Handles category page rendering with products, filters, and subcategories
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogService } from '@/services/catalog';
import { ContentService } from '@/services/content';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { asyncHandler, handleValidationError } from '@/middlewares/error';
import { NotFoundError } from '@/lib/errors';

/**
 * Category route parameters schema
 */
const categoryParamsSchema = z.object({
  slug: z.string().min(1, 'Category slug is required'),
});

/**
 * Category query parameters schema
 */
const categoryQuerySchema = z.object({
  f: z.string().optional(),
  sortOn: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  filters: z.coerce.boolean().optional().default(true),
});

/**
 * Category page data interface
 */
interface CategoryPageData {
  category: any;
  products: any[];
  filters: any[];
  sortOptions: any[];
  pagination: any;
  subcategories: any[];
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
 * Category page controller
 */
export const categoryController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ params: req.params, query: req.query }, 'Rendering category page');

    try {
      // Validate parameters
      const { slug } = categoryParamsSchema.parse(req.params);
      const queryParams = categoryQuerySchema.parse(req.query);
      
      // Fetch category and products data in parallel
      const [category, productsData, navigation] = await Promise.all([
        CatalogService.Category.getCategory(slug, context),
        CatalogService.Category.getCategoryProducts(slug, {
          f: queryParams.f,
          filters: queryParams.filters,
          sortOn: queryParams.sortOn,
          pageSize: queryParams.pageSize,
          pageNo: queryParams.page,
        }, context),
        ContentService.Navigation.getNavigation(context),
      ]);

      if (!category) {
        throw new NotFoundError('Category', slug, { slug }, context?.traceId);
      }

      // Get subcategories if available
      const subcategories = category.departments || [];

      // Parse current filters
      const currentFilters = parseFilters(queryParams.f);

      // Build breadcrumbs
      const breadcrumbs = buildBreadcrumbs(category);

      // Prepare SEO data
      const seo = buildSEO(category, productsData, req);

      // Prepare template data
      const templateData: CategoryPageData = {
        category,
        products: productsData?.items || [],
        filters: productsData?.filters || [],
        sortOptions: productsData?.sort_on || [],
        pagination: productsData?.page || {},
        subcategories: subcategories.slice(0, 12), // Show first 12 subcategories
        currentFilters,
        navigation,
        seo,
        breadcrumbs,
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/category'
        },
      };

      // Set cache headers
      HttpCacheControl.setHeaders(res, {
        maxAge: 300, // 5 minutes for category pages
        staleWhileRevalidate: 600,
        public: true,
      });

      // Render category template
      res.render('pages/category', templateData);

      logger.info({
        categoryId: category.uid,
        categoryName: category.name,
        productsCount: productsData?.items?.length || 0,
        totalProducts: productsData?.page?.item_total || 0,
        subcategoriesCount: subcategories.length,
        currentPage: queryParams.page,
      }, 'Category page rendered successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'params');
      }
      
      logger.error({ err: error }, 'Failed to render category page');
      throw error;
    }
  }
);

/**
 * Category API endpoint
 */
export const categoryApiController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ params: req.params, query: req.query }, 'Fetching category data via API');

    try {
      const { slug } = categoryParamsSchema.parse(req.params);
      const queryParams = categoryQuerySchema.parse(req.query);
      
      const [category, productsData] = await Promise.all([
        CatalogService.Category.getCategory(slug, context),
        CatalogService.Category.getCategoryProducts(slug, {
          f: queryParams.f,
          filters: queryParams.filters,
          sortOn: queryParams.sortOn,
          pageSize: queryParams.pageSize,
          pageNo: queryParams.page,
        }, context),
      ]);

      if (!category) {
        throw new NotFoundError('Category', slug, { slug }, context?.traceId);
      }

      const data = {
        category,
        products: productsData,
        currentFilters: parseFilters(queryParams.f),
        timestamp: new Date().toISOString(),
      };

      HttpCacheControl.setHeaders(res, {
        maxAge: 300,
        public: true,
      });

      res.json(data);

      logger.info('Category API response sent');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'params');
      }
      
      logger.error({ err: error }, 'Failed to fetch category data');
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
 * Build breadcrumbs for category
 */
function buildBreadcrumbs(category: any): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ];

  // Add parent categories if available (would need hierarchy data)
  breadcrumbs.push({
    name: category.name,
    url: `/category/${category.slug}`
  });

  return breadcrumbs;
}

/**
 * Build SEO metadata for category
 */
function buildSEO(category: any, productsData: any, req: Request) {
  const totalProducts = productsData?.page?.item_total || 0;
  
  const title = category.seo?.title || `${category.name} - Shop ${totalProducts} Products`;
  const description = category.seo?.description || 
    category.description || 
    `Discover ${totalProducts} amazing ${category.name.toLowerCase()} products at great prices. Shop now for the best deals.`;

  return {
    title,
    description,
    canonical: `${req.protocol}://${req.get('host')}${req.path}`,
  };
}
