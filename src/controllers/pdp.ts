/**
 * Product Detail Page (PDP) controller
 * 
 * Handles individual product page rendering with variants, reviews, and related products
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
 * PDP route parameters schema
 */
const pdpParamsSchema = z.object({
  slug: z.string().min(1, 'Product slug is required'),
});

/**
 * PDP query parameters schema
 */
const pdpQuerySchema = z.object({
  variant: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
});

/**
 * PDP page data interface
 */
interface PDPPageData {
  product: any;
  selectedVariant?: any;
  relatedProducts: any[];
  navigation: any;
  seo: {
    title: string;
    description: string;
    canonical: string;
    jsonLd: any;
  };
  breadcrumbs: Array<{
    name: string;
    url: string;
  }>;
  schema: {
    product: any;
  };
  req?: any;
}

/**
 * Product detail controller
 */
export const pdpController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ params: req.params, query: req.query }, 'Rendering product detail page');

    try {
      // Validate parameters
      const { slug } = pdpParamsSchema.parse(req.params);
      const queryParams = pdpQuerySchema.parse(req.query);
      
      // Fetch product data
      const product = await CatalogService.Product.getProduct(slug, context);
      
      if (!product) {
        throw new NotFoundError('Product', slug, { slug }, context?.traceId);
      }

      // Find selected variant if specified
      let selectedVariant = null;
      if (product.variants && product.variants.length > 0) {
        if (queryParams.variant) {
          selectedVariant = product.variants.find(
            (v: any) => v.uid === queryParams.variant
          );
        }
        
        // If no variant selected or variant not found, use first available
        if (!selectedVariant) {
          selectedVariant = product.variants.find((v: any) => v.sellable) || product.variants[0];
        }
      }

      // Fetch related data in parallel
      const [navigation, relatedProducts] = await Promise.all([
        ContentService.Navigation.getNavigation(context),
        // Get related products from same category
        product.category?.slug 
          ? CatalogService.Category.getCategoryProducts(
              product.category.slug,
                             { pageSize: 8 },
              context
            ).then((data: any) => data?.items?.filter((p: any) => p.uid !== product.uid) || [])
          : Promise.resolve([])
      ]);

      // Build breadcrumbs
      const breadcrumbs = buildBreadcrumbs(product);

      // Prepare SEO data
      const seo = buildSEO(product, selectedVariant, req);

      // Prepare template data
      const templateData: PDPPageData = {
        product,
        selectedVariant,
        relatedProducts: relatedProducts.slice(0, 4), // Show 4 related products
        navigation,
        seo,
        breadcrumbs,
        schema: {
          product: buildProductSchema(product, selectedVariant, req),
        },
        req: {
          ...req,
          path: req.path || req.route?.path || req.originalUrl || '/'
        },
      };

      // Set cache headers for product pages
      HttpCacheControl.setHeaders(res, {
        maxAge: 600, // 10 minutes for product pages
        staleWhileRevalidate: 1200,
        public: true,
      });

      // Render PDP template
      res.render('pages/pdp', templateData);

      logger.info({
        productId: product.uid,
        productName: product.name,
        hasVariants: product.has_variant,
        selectedVariantId: selectedVariant?.uid,
        relatedProductsCount: relatedProducts.length,
      }, 'PDP rendered successfully');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'params');
      }
      
      logger.error({ err: error }, 'Failed to render PDP');
      throw error;
    }
  }
);

/**
 * Product detail API endpoint
 */
export const pdpApiController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const logger = requestLogger(req.id);
    const context = (req as any).context;

    logger.info({ params: req.params }, 'Fetching PDP data via API');

    try {
      const { slug } = pdpParamsSchema.parse(req.params);
      
      const product = await CatalogService.Product.getProduct(slug, context);
      
      if (!product) {
        throw new NotFoundError('Product', slug, { slug }, context?.traceId);
      }

      const data = {
        product,
        timestamp: new Date().toISOString(),
      };

      HttpCacheControl.setHeaders(res, {
        maxAge: 600,
        public: true,
      });

      res.json(data);

      logger.info('PDP API response sent');

    } catch (error) {
      if (error instanceof z.ZodError) {
        handleValidationError(error, 'params');
      }
      
      logger.error({ err: error }, 'Failed to fetch PDP data');
      throw error;
    }
  }
);

/**
 * Build breadcrumbs for product
 */
function buildBreadcrumbs(product: any): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
  ];

  if (product.category) {
    breadcrumbs.push({
      name: product.category.name,
      url: `/category/${product.category.slug}`
    });
  }

  breadcrumbs.push({
    name: product.name,
    url: `/product/${product.slug}`
  });

  return breadcrumbs;
}

/**
 * Build SEO metadata for product
 */
function buildSEO(product: any, selectedVariant: any, req: Request) {
  const title = product.seo?.title || `${product.name} - ${product.brand?.name || 'Fynd Store'}`;
  const description = product.seo?.description || 
    product.short_description || 
    `Buy ${product.name} online at best price. ${product.brand?.name || ''} products available with fast delivery.`;

  // Build JSON-LD structured data
  const jsonLd = buildProductJsonLd(product, selectedVariant, req);

  return {
    title,
    description,
    canonical: `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`,
    jsonLd,
  };
}

/**
 * Build JSON-LD structured data for product
 */
function buildProductJsonLd(product: any, selectedVariant: any, req: Request) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const productUrl = `${baseUrl}/product/${product.slug}`;
  
  const currentProduct = selectedVariant || product;
  const price = currentProduct.price?.selling || currentProduct.price?.effective;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.short_description,
    image: product.images?.map((img: any) => img.url) || [],
    url: productUrl,
    sku: currentProduct.item_code || currentProduct.uid,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand.name,
    } : undefined,
    category: product.category?.name,
    offers: price ? {
      '@type': 'Offer',
      price: price.min || price.max || 0,
      priceCurrency: price.currency_code || 'INR',
      availability: currentProduct.sellable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'Fynd Store',
      },
    } : undefined,
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.rating_count || 1,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };
}

/**
 * Build product schema for template
 */
function buildProductSchema(product: any, selectedVariant: any, req: Request) {
  return buildProductJsonLd(product, selectedVariant, req);
}
