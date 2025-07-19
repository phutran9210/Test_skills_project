import { RedisClientType } from 'redis';
import RedisConnection from '../config/redis.config';
import { Product } from '../models/product.entity';
import { CacheConnectionError, CacheOperationError, delay } from '../utils';
import cacheConfig from '../config/cache.config';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  useHash?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  operations: number;
  errors: number;
  retries: number;
  hitRate: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  maxDelay: number;
}

/**
 * Enhanced Redis caching service with hash support, error handling, and retry mechanisms
 */
export class RedisCacheService {
  private static instance: RedisCacheService;
  private client: RedisClientType;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    operations: 0,
    errors: 0,
    retries: 0,
    hitRate: 0,
  };

  private readonly CACHE_PREFIX = 'product';
  private readonly HASH_PREFIX = 'products_hash';
  private readonly LIST_PREFIX = 'products_list';

  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 100,
    backoffFactor: 2,
    maxDelay: 1000,
  };

  private constructor(redisConnection?: RedisConnection) {
    this.client = (redisConnection || RedisConnection.getInstance()).getClient();
  }

  public static getInstance(redisConnection?: RedisConnection): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService(redisConnection);
    }
    return RedisCacheService.instance;
  }

  /**
   * Generates cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.CACHE_PREFIX;
    return `${keyPrefix}:${key}`;
  }

  /**
   * Gets TTL for product cache
   */
  private getProductTTL(customTTL?: number): number {
    return customTTL || cacheConfig.productTTL;
  }

  /**
   * Gets TTL for product list cache
   */
  private getProductListTTL(customTTL?: number): number {
    return customTTL || cacheConfig.productListTTL;
  }

  /**
   * Generates hash key for product storage
   */
  private generateHashKey(id: number, prefix?: string): string {
    const keyPrefix = prefix || this.HASH_PREFIX;
    return `${keyPrefix}:${id}`;
  }

  /**
   * Updates cache statistics
   */
  private updateStats(hit: boolean, error: boolean = false, retry: boolean = false): void {
    this.stats.operations++;
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    if (error) {
      this.stats.errors++;
    }
    if (retry) {
      this.stats.retries++;
    }
    this.stats.hitRate =
      this.stats.operations > 0 ? (this.stats.hits / this.stats.operations) * 100 : 0;
  }

  /**
   * Implements retry mechanism with exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig = this.retryConfig,
  ): Promise<T> {
    let lastError: Error | undefined;
    let delayMs = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.updateStats(false, false, true);
          await delay(delayMs);
          delayMs = Math.min(delayMs * config.backoffFactor, config.maxDelay);
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === config.maxRetries) {
          this.updateStats(false, true);
          throw new CacheOperationError(
            `Operation ${operationName} failed after ${config.maxRetries} retries: ${lastError.message}`,
            operationName,
            lastError,
          );
        }

        console.warn(
          `Cache operation ${operationName} failed, attempt ${attempt + 1}/${config.maxRetries + 1}: ${lastError.message}`,
        );
      }
    }

    throw lastError;
  }

  /**
   * Checks if Redis client is connected
   */
  private async ensureConnection(): Promise<void> {
    const redisConnection = RedisConnection.getInstance();
    if (!redisConnection.isClientConnected()) {
      throw new CacheConnectionError('Redis client is not connected');
    }
  }

  /**
   * Scans for keys matching a pattern using SCAN command for better performance
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
  }

  /**
   * Reconstructs Product object from Redis hash with validation
   */
  private reconstructProductFromHash(productHash: Record<string, string>): Product {
    // Validate required fields
    if (!productHash.id || !productHash.name || !productHash.price || !productHash.category) {
      throw new Error('Invalid product hash data: missing required fields');
    }

    const id = parseInt(productHash.id);
    const price = parseFloat(productHash.price);

    // Validate parsed values
    if (isNaN(id) || id <= 0) {
      throw new Error('Invalid product hash data: invalid ID');
    }

    if (isNaN(price) || price < 0) {
      throw new Error('Invalid product hash data: invalid price');
    }

    return {
      id,
      name: productHash.name.trim(),
      price,
      category: productHash.category.trim(),
    } as Product;
  }

  /**
   * Caches a single product using hash data structure
   */
  async cacheProduct(product: Product, options?: CacheOptions): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const useHash = options?.useHash ?? true;
      const ttl = this.getProductTTL(options?.ttl);

      if (useHash) {
        const hashKey = this.generateHashKey(product.id, options?.prefix);

        // Store product fields as hash
        const productHash = {
          id: product.id.toString(),
          name: product.name,
          price: product.price.toString(),
          category: product.category,
          cachedAt: new Date().toISOString(),
        };

        await this.client.hSet(hashKey, productHash);
        await this.client.expire(hashKey, ttl);
        console.log(`Cached product ${product.id} as hash with TTL ${ttl}s`);
      } else {
        // Fallback to string-based caching
        const key = this.generateKey(`single:${product.id}`, options?.prefix);
        await this.client.setEx(key, ttl, JSON.stringify(product));
        console.log(`Cached product ${product.id} as string with TTL ${ttl}s`);
      }
    }, 'cacheProduct');
  }

  /**
   * Retrieves a cached product using hash data structure
   */
  async getCachedProduct(id: number, options?: CacheOptions): Promise<Product | null> {
    return await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const useHash = options?.useHash ?? true;

      if (useHash) {
        const hashKey = this.generateHashKey(id, options?.prefix);
        const productHash = await this.client.hGetAll(hashKey);

        if (Object.keys(productHash).length > 0) {
          this.updateStats(true);
          console.log(`Cache hit for product ${id} (hash)`);

          // Convert hash back to Product object with validation
          return this.reconstructProductFromHash(productHash);
        }
      } else {
        // Fallback to string-based caching
        const key = this.generateKey(`single:${id}`, options?.prefix);
        const cached = await this.client.get(key);

        if (cached) {
          this.updateStats(true);
          console.log(`Cache hit for product ${id} (string)`);
          return JSON.parse(cached) as Product;
        }
      }

      this.updateStats(false);
      console.log(`Cache miss for product ${id}`);
      return null;
    }, 'getCachedProduct');
  }

  /**
   * Caches multiple products (e.g., for product list)
   */
  async cacheProducts(
    products: Product[],
    cacheKey: string,
    options?: CacheOptions,
  ): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const key = this.generateKey(`list:${cacheKey}`, options?.prefix);
      const ttl = this.getProductListTTL(options?.ttl);

      await this.client.setEx(key, ttl, JSON.stringify(products));
      console.log(`Cached ${products.length} products with key "${cacheKey}" TTL ${ttl}s`);
    }, 'cacheProducts');
  }

  /**
   * Retrieves cached products list
   */
  async getCachedProducts(cacheKey: string, options?: CacheOptions): Promise<Product[] | null> {
    return await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const key = this.generateKey(`list:${cacheKey}`, options?.prefix);
      const cached = await this.client.get(key);

      if (cached) {
        this.updateStats(true);
        console.log(`Cache hit for products list "${cacheKey}"`);
        return JSON.parse(cached) as Product[];
      }

      this.updateStats(false);
      console.log(`Cache miss for products list "${cacheKey}"`);
      return null;
    }, 'getCachedProducts');
  }

  /**
   * Invalidates a specific product cache (both hash and string versions)
   */
  async invalidateProduct(id: number, options?: CacheOptions): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const keysToDelete: string[] = [];

      // Hash-based key
      const hashKey = this.generateHashKey(id, options?.prefix);
      keysToDelete.push(hashKey);

      // String-based key (for backward compatibility)
      const stringKey = this.generateKey(`single:${id}`, options?.prefix);
      keysToDelete.push(stringKey);

      const deletedCount = await this.client.del(keysToDelete);
      console.log(`Invalidated cache for product ${id}, deleted ${deletedCount} keys`);
    }, 'invalidateProduct');
  }

  /**
   * Invalidates product list caches only
   */
  async invalidateProductLists(options?: CacheOptions): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const patterns = [
        `${options?.prefix || this.CACHE_PREFIX}:list:*`,
        `${options?.prefix || this.LIST_PREFIX}:*`,
      ];

      let totalDeleted = 0;

      for (const pattern of patterns) {
        const keys = await this.scanKeys(pattern);
        if (keys.length > 0) {
          const deleted = await this.client.del(keys);
          totalDeleted += deleted;
        }
      }

      console.log(`Invalidated ${totalDeleted} product list cache entries`);
    }, 'invalidateProductLists');
  }

  /**
   * Updates specific fields in a product hash
   */
  async updateProductHash(
    id: number,
    fields: Partial<Product>,
    options?: CacheOptions,
  ): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.ensureConnection();

      const hashKey = this.generateHashKey(id, options?.prefix);
      const updates: Record<string, string> = {};

      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.price !== undefined) updates.price = fields.price.toString();
      if (fields.category !== undefined) updates.category = fields.category;

      // Always update the cached timestamp
      updates.cachedAt = new Date().toISOString();

      if (Object.keys(updates).length > 0) {
        await this.client.hSet(hashKey, updates);
        console.log(`Updated hash fields for product ${id}: ${Object.keys(updates).join(', ')}`);
      }
    }, 'updateProductHash');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Health check for the cache service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    stats: CacheStats;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      await this.ensureConnection();

      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.client.set(testKey, 'test', { EX: 5 });
      const result = await this.client.get(testKey);
      await this.client.del(testKey);

      if (result !== 'test') {
        errors.push('Basic cache operations failed');
      }

      const latency = Date.now() - startTime;

      return {
        status: errors.length === 0 ? 'healthy' : 'unhealthy',
        latency,
        stats: this.getCacheStats(),
        errors,
      };
    } catch (error) {
      errors.push(`Health check failed: ${(error as Error).message}`);
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        stats: this.getCacheStats(),
        errors,
      };
    }
  }
}
