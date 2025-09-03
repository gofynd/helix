/**
 * Tests for cache utilities
 */

import { AppCache, CacheKeyBuilder } from './cache';

describe('AppCache', () => {
  let cache: AppCache;

  beforeEach(() => {
    cache = new AppCache(10, 60); // Small cache for testing
  });

  afterEach(() => {
    cache.clear();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cache.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      const value = 'test-value';

      expect(cache.has(key)).toBe(false);
      
      cache.set(key, value);
      expect(cache.has(key)).toBe(true);
    });

    it('should delete values', () => {
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      expect(cache.has(key)).toBe(true);

      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);

      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const shortTtl = 0.1; // 100ms

      cache.set(key, value, shortTtl);
      expect(cache.get(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.get(key)).toBeUndefined();
      expect(cache.has(key)).toBe(false);
    });
  });

  describe('getOrSet functionality', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const cachedValue = 'cached-value';
      const factoryValue = 'factory-value';

      cache.set(key, cachedValue);

      const factory = jest.fn().mockResolvedValue(factoryValue);
      const result = await cache.getOrSet(key, factory);

      expect(result).toBe(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory if value not cached', async () => {
      const key = 'test-key';
      const factoryValue = 'factory-value';

      const factory = jest.fn().mockResolvedValue(factoryValue);
      const result = await cache.getOrSet(key, factory);

      expect(result).toBe(factoryValue);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get(key)).toBe(factoryValue);
    });

    it('should propagate factory errors', async () => {
      const key = 'test-key';
      const error = new Error('Factory error');

      const factory = jest.fn().mockRejectedValue(error);

      await expect(cache.getOrSet(key, factory)).rejects.toThrow('Factory error');
      expect(cache.has(key)).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      const key1 = 'key1';
      const key2 = 'key2';
      const value = 'value';

      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);

      // Set values
      cache.set(key1, value);
      cache.set(key2, value);

      stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.size).toBe(2);

      // Cache hits
      cache.get(key1);
      cache.get(key1);

      stats = cache.getStats();
      expect(stats.hits).toBe(2);

      // Cache misses
      cache.get('non-existent');

      stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit ratio', () => {
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      
      // 2 hits, 1 miss
      cache.get(key);
      cache.get(key);
      cache.get('non-existent');

      const hitRatio = cache.getHitRatio();
      expect(hitRatio).toBe(2 / 3); // 2 hits out of 3 total requests
    });
  });
});

describe('CacheKeyBuilder', () => {
  describe('GraphQL keys', () => {
    it('should generate consistent keys for same operation and variables', () => {
      const operation = 'GetProduct';
      const variables = { slug: 'test-product' };

      const key1 = CacheKeyBuilder.graphql(operation, variables);
      const key2 = CacheKeyBuilder.graphql(operation, variables);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^graphql:GetProduct:/);
    });

    it('should generate different keys for different variables', () => {
      const operation = 'GetProduct';
      const variables1 = { slug: 'product-1' };
      const variables2 = { slug: 'product-2' };

      const key1 = CacheKeyBuilder.graphql(operation, variables1);
      const key2 = CacheKeyBuilder.graphql(operation, variables2);

      expect(key1).not.toBe(key2);
    });

    it('should handle empty variables', () => {
      const operation = 'GetCategories';

      const key = CacheKeyBuilder.graphql(operation);

      expect(key).toMatch(/^graphql:GetCategories:empty$/);
    });
  });

  describe('Product keys', () => {
    it('should generate product keys', () => {
      const slug = 'test-product';
      const key = CacheKeyBuilder.product(slug);

      expect(key).toBe('product:test-product');
    });

    it('should generate product keys with variants', () => {
      const slug = 'test-product';
      const variant = 'red-large';
      const key = CacheKeyBuilder.product(slug, variant);

      expect(key).toBe('product:test-product:red-large');
    });
  });

  describe('Category keys', () => {
    it('should generate category keys', () => {
      const slug = 'electronics';
      const key = CacheKeyBuilder.category(slug);

      expect(key).toMatch(/^category:electronics:/);
    });

    it('should generate category keys with filters', () => {
      const slug = 'electronics';
      const filters = { brand: 'apple', price: '100-500' };
      
      const key1 = CacheKeyBuilder.category(slug, filters);
      const key2 = CacheKeyBuilder.category(slug, filters);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^category:electronics:/);
    });
  });

  describe('Search keys', () => {
    it('should generate search keys', () => {
      const query = 'laptop';
      const key = CacheKeyBuilder.search(query);

      expect(key).toMatch(/^search:.+:empty$/);
    });

    it('should generate search keys with filters', () => {
      const query = 'laptop';
      const filters = { brand: 'dell' };
      
      const key = CacheKeyBuilder.search(query, filters);

      expect(key).toMatch(/^search:.+:.+$/);
      expect(key).not.toMatch(/empty$/);
    });
  });
});
