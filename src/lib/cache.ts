/**
 * LRU Cache implementation with TTL support
 * 
 * Features:
 * - In-memory LRU cache with configurable size
 * - TTL (Time To Live) support
 * - Cache key generation utilities
 * - Metrics and monitoring
 * - Thread-safe operations
 */

import { LRUCache } from 'lru-cache';
import { Config } from './config';
import { CacheLogger } from './logger';
import { createHash } from 'crypto';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T = any> {
  data: T;
  createdAt: number;
  ttl: number;
  hits: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  maxSize: number;
}

/**
 * LRU Cache wrapper with TTL and monitoring
 */
export class AppCache {
  private cache: LRUCache<string, CacheEntry>;
  private stats: CacheStats;

  constructor(maxSize: number = Config.cacheMaxSize, ttlSeconds: number = Config.cacheTtl) {
    this.cache = new LRUCache<string, CacheEntry>({
      max: maxSize,
      ttl: ttlSeconds * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      allowStale: false,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      maxSize,
    };
  }

  /**
   * Gets value from cache
   */
  get<T = any>(key: string, traceId?: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Check if entry is still valid (additional TTL check)
      const now = Date.now();
      if (now - entry.createdAt > entry.ttl * 1000) {
        this.cache.delete(key);
        this.stats.misses++;
        CacheLogger.miss(key, 'get', traceId);
        return undefined;
      }

      entry.hits++;
      this.stats.hits++;
      CacheLogger.hit(key, 'get', traceId);
      return entry.data;
    }

    this.stats.misses++;
    CacheLogger.miss(key, 'get', traceId);
    return undefined;
  }

  /**
   * Sets value in cache with optional TTL override
   */
  set<T = any>(key: string, value: T, ttlSeconds?: number, traceId?: string): void {
    const ttl = ttlSeconds || Config.cacheTtl;
    const entry: CacheEntry<T> = {
      data: value,
      createdAt: Date.now(),
      ttl,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    CacheLogger.set(key, ttl, traceId);
  }

  /**
   * Deletes value from cache
   */
  delete(key: string, _traceId?: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Checks if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    const now = Date.now();
    if (now - entry.createdAt > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      ...this.stats,
      size: 0,
    };
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
    };
  }

  /**
   * Gets cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Gets or sets value with factory function
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
    traceId?: string
  ): Promise<T> {
    const cached = this.get<T>(key, traceId);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const value = await factory();
      this.set(key, value, ttlSeconds, traceId);
      return value;
    } catch (error) {
      CacheLogger.error(key, 'getOrSet', error as Error, traceId);
      throw error;
    }
  }
}

/**
 * Cache key generation utilities
 */
export class CacheKeyBuilder {
  /**
   * Creates cache key for GraphQL operations
   */
  static graphql(operationName: string, variables: Record<string, any> = {}): string {
    const variablesHash = this.hashObject(variables);
    return `graphql:${operationName}:${variablesHash}`;
  }

  /**
   * Creates cache key for page data
   */
  static page(route: string, params: Record<string, any> = {}, query: Record<string, any> = {}): string {
    const paramsHash = this.hashObject(params);
    const queryHash = this.hashObject(query);
    return `page:${route}:${paramsHash}:${queryHash}`;
  }

  /**
   * Creates cache key for product data
   */
  static product(slug: string, variant?: string): string {
    return variant ? `product:${slug}:${variant}` : `product:${slug}`;
  }

  /**
   * Creates cache key for category data
   */
  static category(slug: string, filters: Record<string, any> = {}): string {
    const filtersHash = this.hashObject(filters);
    return `category:${slug}:${filtersHash}`;
  }

  /**
   * Creates cache key for collection data
   */
  static collection(slug: string, filters: Record<string, any> = {}): string {
    const filtersHash = this.hashObject(filters);
    return `collection:${slug}:${filtersHash}`;
  }

  /**
   * Creates cache key for search results
   */
  static search(query: string, filters: Record<string, any> = {}): string {
    const filtersHash = this.hashObject(filters);
    const queryHash = this.hashString(query);
    return `search:${queryHash}:${filtersHash}`;
  }

  /**
   * Creates hash of object for cache key
   */
  private static hashObject(obj: Record<string, any>): string {
    if (!obj || Object.keys(obj).length === 0) {
      return 'empty';
    }

    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj = sortedKeys.reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Record<string, any>);

    return this.hashString(JSON.stringify(sortedObj));
  }

  /**
   * Creates hash of string
   */
  private static hashString(str: string): string {
    return createHash('md5').update(str).digest('hex').substring(0, 8);
  }
}

/**
 * HTTP cache control utilities
 */
export class HttpCacheControl {
  /**
   * Sets cache headers for successful responses
   */
  static setHeaders(
    res: any,
    options: {
      maxAge?: number;
      sMaxAge?: number;
      staleWhileRevalidate?: number;
      staleIfError?: number;
      mustRevalidate?: boolean;
      noCache?: boolean;
      noStore?: boolean;
      private?: boolean;
      public?: boolean;
    } = {}
  ): void {
    const {
      maxAge = Config.cacheTtl,
      sMaxAge,
      staleWhileRevalidate = maxAge * 2,
      staleIfError = maxAge * 5,
      mustRevalidate = false,
      noCache = false,
      noStore = false,
      private: isPrivate = false,
      public: isPublic = !isPrivate,
    } = options;

    if (noStore) {
      res.set('Cache-Control', 'no-store');
      return;
    }

    if (noCache) {
      res.set('Cache-Control', 'no-cache, must-revalidate');
      return;
    }

    const directives: string[] = [];

    if (isPublic) directives.push('public');
    if (isPrivate) directives.push('private');
    if (mustRevalidate) directives.push('must-revalidate');

    directives.push(`max-age=${maxAge}`);
    
    if (sMaxAge) {
      directives.push(`s-maxage=${sMaxAge}`);
    }

    if (staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }

    if (staleIfError) {
      directives.push(`stale-if-error=${staleIfError}`);
    }

    res.set('Cache-Control', directives.join(', '));
  }

  /**
   * Sets no-cache headers
   */
  static setNoCache(res: any): void {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
  }

  /**
   * Sets ETag header
   */
  static setETag(res: any, content: string): void {
    const etag = createHash('md5').update(content).digest('hex');
    res.set('ETag', `"${etag}"`);
  }
}

// Global cache instance
export const cache = new AppCache();
