/**
 * Content service for home page, banners, navigation, and pages
 */

import { GraphQLClientFactory, RequestContext } from '@/lib/apollo';
import { CacheKeyBuilder, cache } from '@/lib/cache';
import { Config } from '@/lib/config';
import {
  GET_HOME_CONTENT,
  GET_PAGE,
  GET_NAVIGATION,
  GET_BANNERS,
  GET_APP_CONFIG,
  GET_FOOTER,
} from '@/graphql/queries/content';
import { GET_APPLICATION_CONTENT } from '@/graphql/queries/catalog';

/**
 * Home page service operations
 */
export class HomeService {
  /**
   * Get home page content
   */
  static async getHomeContent(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetHomeContent');

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          await GraphQLClientFactory.executeQuery(
            client,
            GET_HOME_CONTENT,
            {},
            context
          );
          // Return fallback data since query uses _empty
          return {
            id: 'home',
            title: 'Home',
            slug: 'home',
            published: true,
            tags: [],
            date_meta: {
              created_on: new Date().toISOString(),
              modified_on: new Date().toISOString()
            },
            sections: [
              {
                type: 'hero',
                name: 'hero-banner',
                props: {},
                blocks: [
                  {
                    type: 'banner',
                    name: 'main-hero',
                    props: {},
                    text: 'Welcome to Our Store',
                    images: [
                      {
                        url: 'https://via.placeholder.com/1200x600/4f46e5/ffffff?text=Welcome+to+Our+Store',
                        alt: 'Welcome banner'
                      }
                    ],
                    action: {
                      type: 'page',
                      page: {
                        type: 'products',
                        params: {},
                        query: {},
                        url: '/products'
                      }
                    }
                  }
                ]
              }
            ]
          };
        } catch (error) {
          // Return fallback data on error
          return {
            id: 'home',
            title: 'Home',
            slug: 'home',
            published: true,
            tags: [],
            date_meta: {
              created_on: new Date().toISOString(),
              modified_on: new Date().toISOString()
            },
            sections: [
              {
                type: 'hero',
                name: 'hero-banner',
                props: {},
                blocks: [
                  {
                    type: 'banner',
                    name: 'main-hero',
                    props: {},
                    text: 'Welcome to Our Store',
                    images: [
                      {
                        url: 'https://via.placeholder.com/1200x600/4f46e5/ffffff?text=Welcome+to+Our+Store',
                        alt: 'Welcome banner'
                      }
                    ],
                    action: {
                      type: 'page',
                      page: {
                        type: 'products',
                        params: {},
                        query: {},
                        url: '/products'
                      }
                    }
                  }
                ]
              }
            ]
          };
        }
      },
      Config.cacheTtl * 2, // Longer cache for home content
      context?.traceId
    );
  }
}

/**
 * Page service operations
 */
export class PageService {
  /**
   * Get page by slug
   */
  static async getPage(
    slug: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.page(slug);

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_PAGE,
          { slug },
          context
        );
        return data.page;
      },
      Config.cacheTtl * 4, // Very long cache for static pages
      context?.traceId
    );
  }
}

/**
 * Navigation service operations
 */
export class NavigationService {
  /**
   * Get navigation menu
   */
  static async getNavigation(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetNavigation');

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          await GraphQLClientFactory.executeQuery(
            client,
            GET_NAVIGATION,
            {},
            context
          );
          // Return fallback navigation data
          return {
            items: [
              {
                display: 'Home',
                type: 'page',
                action: {
                  type: 'page',
                  page: {
                    type: 'home',
                    params: {},
                    query: {},
                    url: '/'
                  }
                },
                tags: ['header'],
                child: []
              }
            ]
          };
        } catch (error) {
          // Return fallback navigation data on error
          return {
            items: [
              {
                display: 'Home',
                type: 'page',
                action: {
                  type: 'page',
                  page: {
                    type: 'home',
                    params: {},
                    query: {},
                    url: '/'
                  }
                },
                tags: ['header'],
                child: []
              }
            ]
          };
        }
      },
      Config.cacheTtl * 8, // Very long cache for navigation
      context?.traceId
    );
  }
}

/**
 * Banner service operations
 */
export class BannerService {
  /**
   * Get banners by page type
   */
  static async getBanners(
    pageType: string,
    context?: RequestContext
  ): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetBanners', { pageType });

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_BANNERS,
          { page_type: pageType },
          context
        );
        return data.banners;
      },
      Config.cacheTtl * 2, // Longer cache for banners
      context?.traceId
    );
  }
}

/**
 * Application service operations
 */
export class ApplicationService {
  /**
   * Get application configuration
   */
  static async getAppConfig(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetAppConfig');

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_APP_CONFIG,
          {},
          context
        );
        return data.application;
      },
      Config.cacheTtl * 8, // Very long cache for app config
      context?.traceId
    );
  }

  /**
   * Get footer content
   */
  static async getFooter(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetFooter');

    return cache.getOrSet(
      cacheKey,
      async () => {
        const data = await GraphQLClientFactory.executeQuery(
          client,
          GET_FOOTER,
          {},
          context
        );
        return data.footer;
      },
      Config.cacheTtl * 4, // Long cache for footer
      context?.traceId
    );
  }

  /**
   * Get application content including legal information
   */
  static async getApplicationContent(context?: RequestContext): Promise<any> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('GetApplicationContent', {});

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          const data = await GraphQLClientFactory.executeQuery(
            client,
            GET_APPLICATION_CONTENT,
            {},
            context
          );
          return data.applicationContent;
        } catch (error) {
          console.error('Failed to fetch application content:', error);
          // Return default legal information on error
          return {
            legal_information: {
              tnc: 'Terms and conditions content will be loaded here.',
              policy: 'Privacy policy content will be loaded here.',
              shipping: 'Shipping policy content will be loaded here.',
              returns: 'Return policy content will be loaded here.'
            },
            seo_configuration: {},
            support_information: {},
            announcements: {}
          };
        }
      },
      Config.cacheTtl * 8, // Very long cache for application content
      context?.traceId
    );
  }

  /**
   * Get legal information specifically
   */
  static async getLegalInformation(context?: RequestContext): Promise<any> {
    const appContent = await this.getApplicationContent(context);
    return appContent?.legal_information || {
      tnc: '',
      policy: '',
      shipping: '',
      returns: ''
    };
  }
}

/**
 * Content service aggregator
 */
export const ContentService = {
  Home: HomeService,
  Page: PageService,
  Navigation: NavigationService,
  Banner: BannerService,
  Application: ApplicationService,
};
