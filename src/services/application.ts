/**
 * Application service for storefront configuration and common data
 */

import { GraphQLClientFactory, RequestContext } from '@/lib/apollo';
import { CacheKeyBuilder, cache } from '@/lib/cache';
import { Config } from '@/lib/config';
import { GET_APPLICATION_CONFIGURATION } from '@/graphql/queries/catalog';

/**
 * Application configuration type
 */
export interface ApplicationConfiguration {
  app_details?: {
    id?: string;
    description?: string;
    name?: string;
    app_type?: string;
    cache_ttl?: number;
    channel_type?: string;
    company_id?: number;
    created_at?: string;
    updated_at?: string;
    is_active?: boolean;
    is_internal?: boolean;
    owner?: string;
    token?: string;
    modified_at?: string;
    version?: string;
    slug?: string;
    mode?: string;
    status?: string;
  };
  app_currencies?: Array<{
    application?: string;
    _id?: string;
    created_at?: string;
    modified_at?: string;
  }>;
  basic_details?: {
    id?: string;
    description?: string;
    name?: string;
    company_id?: number;
    slug?: string;
  };
  contact_info?: {
    id?: string;
    application?: string;
    copyright_text?: string;
    created_at?: string;
    updated_at?: string;
    version?: string;
  };
  features?: {
    id?: string;
    app?: string;
    created_at?: string;
    updated_at?: string;
    modified_at?: string;
    version?: string;
  };
  integration_tokens?: {
    id?: string;
    application?: string;
    created_at?: string;
    updated_at?: string;
    modified_at?: string;
    version?: string;
  };
  languages?: Array<{
    code?: string;
    name?: string;
  }>;
  owner_info?: {
    id?: string;
    created_at?: string;
    description?: string;
    is_active?: boolean;
    name?: string;
    secret?: string;
    token?: string;
    mode?: string;
    slug?: string;
    status?: string;
  };
}

/**
 * Application service for fetching and caching application configuration
 */
export class ApplicationService {
  /**
   * Get application configuration
   * This includes app details, currencies, contact info, features, and other configurations
   */
  static async getApplicationConfiguration(
    context?: RequestContext
  ): Promise<ApplicationConfiguration> {
    const client = GraphQLClientFactory.createForRequest(context || {});
    const cacheKey = CacheKeyBuilder.graphql('ApplicationConfiguration', {});

    return cache.getOrSet(
      cacheKey,
      async () => {
        try {
          const data = await GraphQLClientFactory.executeQuery(
            client,
            GET_APPLICATION_CONFIGURATION,
            {},
            context
          );
          return data.applicationConfiguration || this.getDefaultConfiguration();
        } catch (error) {
          console.error('Failed to fetch application configuration:', error);
          // Return default configuration on error
          return this.getDefaultConfiguration();
        }
      },
      Config.cacheTtl * 8, // Very long cache for application configuration (8x default)
      context?.traceId
    );
  }

  /**
   * Get default configuration fallback
   */
  private static getDefaultConfiguration(): ApplicationConfiguration {
    return {
      app_details: {
        name: 'Fynd Storefront',
        description: 'Modern eCommerce storefront powered by Fynd Platform',
        is_active: true,
        status: 'active'
      },
      basic_details: {
        name: 'Fynd Storefront',
        description: 'Modern eCommerce storefront powered by Fynd Platform'
      },
      contact_info: {
        copyright_text: `© ${new Date().getFullYear()} Fynd. All rights reserved.`
      },
      languages: [
        { code: 'en', name: 'English' }
      ]
    };
  }

  /**
   * Clear application configuration cache
   * Useful when configuration is updated
   */
  static clearCache(): void {
    const cacheKey = CacheKeyBuilder.graphql('ApplicationConfiguration', {});
    cache.delete(cacheKey);
  }

  /**
   * Get storefront display name
   */
  static async getStoreName(context?: RequestContext): Promise<string> {
    const config = await this.getApplicationConfiguration(context);
    return config.basic_details?.name || config.app_details?.name || 'Fynd Storefront';
  }

  /**
   * Get storefront description
   */
  static async getStoreDescription(context?: RequestContext): Promise<string> {
    const config = await this.getApplicationConfiguration(context);
    return config.basic_details?.description || config.app_details?.description || '';
  }

  /**
   * Get copyright text
   */
  static async getCopyrightText(context?: RequestContext): Promise<string> {
    const config = await this.getApplicationConfiguration(context);
    return config.contact_info?.copyright_text || `© ${new Date().getFullYear()} Fynd. All rights reserved.`;
  }

  /**
   * Get available languages
   */
  static async getLanguages(context?: RequestContext): Promise<Array<{ code: string; name: string }>> {
    const config = await this.getApplicationConfiguration(context);
    const languages = config.languages || [{ code: 'en', name: 'English' }];
    
    // Filter out any languages with missing required properties
    return languages.filter((lang): lang is { code: string; name: string } => 
      typeof lang.code === 'string' && typeof lang.name === 'string'
    );
  }

  /**
   * Check if app is active
   */
  static async isActive(context?: RequestContext): Promise<boolean> {
    const config = await this.getApplicationConfiguration(context);
    return config.app_details?.is_active !== false;
  }
}
