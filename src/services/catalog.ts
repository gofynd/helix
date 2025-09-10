/**
 * Catalog service for product, category, and collection operations
 */

import { GraphQLClientFactory, RequestContext } from '@/lib/apollo';
import { CacheKeyBuilder, cache } from '@/lib/cache';
import { Config } from '@/lib/config';
import {
  GET_PRODUCT,
  GET_PRODUCTS,
  GET_PRODUCT_PRICE,
  GET_CATEGORY,
  GET_CATEGORIES,
  GET_CATEGORY_PRODUCTS,
  GET_COLLECTION,
  GET_COLLECTION_PRODUCTS,
  GET_BRANDS,
} from '@/graphql/queries/catalog';

/**
 * Product service operations
 */
export class ProductService {
  /**
   * Get product by slug
   */
  static async getProduct(
    slug: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.product(slug);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_PRODUCT,
          { slug },
          context
        );
        return data.product;
      },
      Config.cacheTtl,
      context?.traceId
    );
  }

  /**
   * Get products listing  
   */
  static async getProducts(
    params: {
      search?: string;
      f?: string;
      filters?: boolean;
      sortOn?: string;
      pageNo?: number;
      pageSize?: number;
      pageType?: string;
    } = {},
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetProducts', params);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_PRODUCTS,
          params,
          context
        );
        return data.products;
      },
      Config.cacheTtl,
      context?.traceId
    );
  }

  /**
   * Search products
   */
  static async searchProducts(
    query: string,
    params: {
      f?: string;
      filters?: boolean;
      sortOn?: string;
      pageSize?: number;
      pageNo?: number;
    } = {},
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.search(query, params);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_PRODUCTS,
          { search: query, ...params },
          context
        );
        return data.products;
      },
      Config.cacheTtl / 2, // Shorter cache for search results
      context?.traceId
    );
  }

  /**
   * Get product price by size
   * Fetches size-specific pricing information including discounts, delivery promise, etc.
   */
  static async getProductPrice(
    slug: string,
    size: string,
    pincode: string = '',
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('ProductPrice', { slug, size, pincode });

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_PRODUCT_PRICE,
          { slug, size, pincode },
          context
        );
        return data.productPrice;
      },
      Config.cacheTtl / 4, // Shorter cache for price data as it can change frequently
      context?.traceId
    );
  }
}

/**
 * Category service operations
 */
export class CategoryService {
  /**
   * Get category by slug
   */
  static async getCategory(
    slug: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.category(slug);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_CATEGORY,
          { slug },
          context
        );
        return data.category;
      },
      Config.cacheTtl * 2, // Longer cache for category data
      context?.traceId
    );
  }

  /**
   * Get all categories
   */
  static async getCategories(
    department?: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetCategories', { department });

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          const data = await GraphQLClientFactory.executeQuery(
            client,
            GET_CATEGORIES,
            { department },
            context
          );
          
          // Transform the API data to match expected structure
          const categories = data.categories?.data?.map((item: any, index: number) => ({
            uid: index + 1,
            name: item.department ? item.department.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Category',
            slug: item.department || `category-${index + 1}`,
            description: `Explore products in ${item.department ? item.department.replace(/-/g, ' ') : 'this category'}`,
            logo: null,
            department: item.department
          })) || [];
          
          return categories;
        } catch (error) {
          // Return fallback data on error
          return [
            {
              uid: 1,
              name: 'Beauty & Personal Care',
              slug: 'beauty-personal-care',
              description: 'Discover premium fragrances and beauty products',
              logo: null,
              department: 'beauty--personal-care'
            }
          ];
        }
      },
      Config.cacheTtl * 4, // Very long cache for categories list
      context?.traceId
    );
  }

  /**
   * Get category products
   */
  static async getCategoryProducts(
    slug: string,
    params: {
      f?: string;
      filters?: boolean;
      sortOn?: string;
      pageSize?: number;
      pageNo?: number;
    } = {},
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.category(slug, params);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_CATEGORY_PRODUCTS,
          { slug, ...params },
          context
        );
        return data.categoryProducts;
      },
      Config.cacheTtl,
      context?.traceId
    );
  }
}

/**
 * Collection service operations
 */
export class CollectionService {
  /**
   * Get collection by slug
   */
  static async getCollection(
    slug: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.collection(slug);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_COLLECTION,
          { slug },
          context
        );
        return data.collection;
      },
      Config.cacheTtl * 2, // Longer cache for collection data
      context?.traceId
    );
  }

  /**
   * Get collection products
   */
  static async getCollectionProducts(
    slug: string,
    params: {
      f?: string;
      filters?: boolean;
      sort_on?: string;
      page_size?: number;
      page_no?: number;
    } = {},
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.collection(slug, params);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_COLLECTION_PRODUCTS,
          { slug, ...params },
          context
        );
        return data.collectionProducts;
      },
      Config.cacheTtl,
      context?.traceId
    );
  }
}

/**
 * Brand service operations
 */
export class BrandService {
  /**
   * Get brands
   */
  static async getBrands(
    params: {
      pageNo?: number;
      pageSize?: number;
    } = {},
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetBrands', params);

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          const data = await GraphQLClientFactory.executeQuery(
            client,
            GET_BRANDS,
            params,
            context
          );
          return data.brands;
        } catch (error) {
          // Return fallback data on error
          return {
            items: [
              {
                uid: 1,
                name: 'Sample Brand',
                slug: 'sample-brand',
                description: 'A premium brand offering quality products'
              }
            ],
            page: {
              current: 1,
              has_next: false,
              has_previous: false,
              item_total: 1,
              size: 20,
              type: 'number'
            }
          };
        }
      },
      Config.cacheTtl * 4, // Very long cache for brands
      context?.traceId
    );
  }
}

/**
 * Catalog service aggregator
 */
export const CatalogService = {
  Product: ProductService,
  Category: CategoryService,
  Collection: CollectionService,
  Brand: BrandService,
  
  // Spread all methods from services for backwards compatibility
  ...ProductService,
  ...CategoryService,
  ...CollectionService,
  ...BrandService,
  
  // Wishlist methods (placeholder implementations)
  async getUserWishlist(_context: RequestContext, _userId: string): Promise<any[]> {
    // In a real implementation, this would fetch wishlist items from the API
    // For now, return empty array or mock data
    return [];
  },

  async addToWishlist(
    _context: RequestContext, 
    _userId: string, 
    _item: { productSlug: string; variantId?: string }
  ): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Added to wishlist',
      itemId: `wishlist-${Date.now()}`,
    };
  },

  async removeFromWishlist(
    _context: RequestContext, 
    _userId: string, 
    _itemId: string
  ): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Removed from wishlist',
    };
  },

  // Cart methods (placeholder implementations)
  async getUserCart(_context: RequestContext, userId: string): Promise<any> {
    // In a real implementation, this would fetch the user's cart
    return {
      id: `cart-${userId}`,
      items: [],
    };
  },

  async getCartItems(_context: RequestContext, _cartId: string): Promise<any[]> {
    // In a real implementation, this would fetch cart items from the API
    return [];
  },

  async getCartSummary(_context: RequestContext, _cartId: string): Promise<any> {
    // In a real implementation, this would calculate cart totals
    return {
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      itemCount: 0,
    };
  },

  async createCart(_context: RequestContext, userId?: string): Promise<string> {
    // Create a new cart and return its ID
    return `cart-${userId || 'anonymous'}-${Date.now()}`;
  },

  async createAnonymousCart(_context: RequestContext): Promise<string> {
    // Create an anonymous cart and return its ID
    return `cart-anonymous-${Date.now()}`;
  },

  async addToCart(
    _context: RequestContext,
    cartId: string,
    _item: { productSlug: string; variantId?: string; quantity: number }
  ): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Added to cart',
      cartId,
      itemId: `cart-item-${Date.now()}`,
    };
  },

  async updateCartItem(
    _context: RequestContext,
    _cartId: string,
    itemId: string,
    quantity: number
  ): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Cart updated',
      itemId,
      quantity,
    };
  },

  async removeFromCart(
    _context: RequestContext,
    _cartId: string,
    _itemId: string
  ): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Removed from cart',
    };
  },

  async clearCart(_context: RequestContext, _cartId: string): Promise<any> {
    // Placeholder implementation
    return {
      success: true,
      message: 'Cart cleared',
    };
  },
};
