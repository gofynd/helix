/**
 * Categories listing controller
 * 
 * Handles categories listing page with department filtering
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogService } from '@/services/catalog';
import { ContentService } from '@/services/content';
import { HttpCacheControl } from '@/lib/cache';
import { requestLogger } from '@/lib/logger';
import { asyncHandler, handleValidationError } from '@/middlewares/error';

/**
 * Categories query parameters schema
 */
const categoriesQuerySchema = z.object({
  department: z.string().optional(),
});

/**
 * Categories page data interface
 */
interface CategoriesPageData {
  categories: any[];
  departments: any[];
  selectedDepartment: string | undefined;
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
 * Categories listing controller
 */
export const categoriesController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Rendering categories listing page');

    try {
      // Validate query parameters
      const { department } = categoriesQuerySchema.parse(req.query);
      
      // Fetch categories and navigation in parallel
      const [categoriesData, navigation] = await Promise.all([
        CatalogService.Category.getCategories(department, context),
        ContentService.Navigation.getNavigation(context),
      ]);

      const categories = categoriesData?.items || [];

      // Extract unique departments from categories
      const departmentsSet = new Set<string>();
      const departmentDetails: any[] = [];
      
      categories.forEach((category: any) => {
        if (category.departments) {
          category.departments.forEach((dept: any) => {
            if (!departmentsSet.has(dept.slug)) {
              departmentsSet.add(dept.slug);
              departmentDetails.push(dept);
            }
          });
        }
      });

      // Sort departments by priority_order
      departmentDetails.sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0));

      // Build breadcrumbs
      const breadcrumbs = buildBreadcrumbs(department, departmentDetails);

      // Prepare SEO data
      const seo = buildSEO(department, categories.length, req);

      // Prepare template data
      const templateData: CategoriesPageData = {
        categories,
        departments: departmentDetails,
        selectedDepartment: department,
        navigation,
        seo,
        breadcrumbs,
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/categories'
        },
      };

      // Set cache headers for categories page
      HttpCacheControl.setHeaders(res, {
        maxAge: 600, // 10 minutes for categories listing
        staleWhileRevalidate: 1200,
        public: true,
      });

      // Render categories template
      res.render('pages/categories', templateData);

      logger.info({
        categoriesCount: categories.length,
        departmentsCount: departmentDetails.length,
        selectedDepartment: department,
      }, 'Categories listing rendered successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to render categories listing');
      throw error;
    }
  }
);

/**
 * Categories API endpoint
 */
export const categoriesApiController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ query: req.query }, 'Fetching categories data via API');

    try {
      const { department } = categoriesQuerySchema.parse(req.query);
      
      const categoriesData = await CatalogService.Category.getCategories(department, context);

      const data = {
        categories: categoriesData?.items || [],
        selectedDepartment: department,
        timestamp: new Date().toISOString(),
      };

      HttpCacheControl.setHeaders(res, {
        maxAge: 600,
        public: true,
      });

      res.json(data);

      logger.info('Categories API response sent');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'query');
      }
      
      logger.error({ err: error }, 'Failed to fetch categories data');
      throw error;
    }
  }
);

/**
 * Build breadcrumbs for categories page
 */
function buildBreadcrumbs(
  selectedDepartment?: string,
  departments: any[] = []
): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ];

  if (selectedDepartment) {
    const department = departments.find(d => d.slug === selectedDepartment);
    if (department) {
      breadcrumbs.push({
        name: department.name,
        url: `/categories?department=${selectedDepartment}`
      });
    }
  }

  return breadcrumbs;
}

/**
 * Build SEO metadata for categories page
 */
function buildSEO(
  selectedDepartment: string | undefined,
  categoriesCount: number,
  req: Request
) {
  let title = 'All Categories - Shop by Category';
  let description = `Browse ${categoriesCount} product categories. Find exactly what you're looking for organized by category.`;

  if (selectedDepartment) {
    const departmentName = selectedDepartment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    title = `${departmentName} Categories - ${categoriesCount} Categories`;
    description = `Browse ${categoriesCount} categories in ${departmentName}. Discover products organized by category for easy shopping.`;
  }

  return {
    title,
    description,
    canonical: `${req.protocol}://${req.get('host')}${req.path}`,
  };
}
