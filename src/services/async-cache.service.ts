import { RedisCacheService } from './redis-cache.service';
import { Product } from '../models/product.entity';
import productConfig from '../config/product.config';

export class AsyncCacheService {
  private cacheService: RedisCacheService;

  constructor(cacheService?: RedisCacheService) {
    this.cacheService = cacheService || RedisCacheService.getInstance();
  }

  /**
   * Async cache product without blocking response
   */
  async cacheProduct(product: Product, options?: { useHash?: boolean }): Promise<void> {
    if (!productConfig.asyncCacheEnabled) {
      return;
    }

    setImmediate(async () => {
      try {
        await this.cacheService.cacheProduct(product, {
          useHash: options?.useHash ?? true,
        });
      } catch (error) {
        console.warn('Async cache failed:', error);
      }
    });
  }

  /**
   * Async invalidate product cache
   */
  async invalidateProduct(productId: number): Promise<void> {
    if (!productConfig.enableCacheInvalidation) {
      return;
    }

    setImmediate(async () => {
      try {
        await this.cacheService.invalidateProduct(productId);
      } catch (error) {
        console.warn('Async cache invalidation failed:', error);
      }
    });
  }

  /**
   * Async invalidate product lists
   */
  async invalidateProductLists(): Promise<void> {
    if (!productConfig.enableProductListInvalidation) {
      return;
    }

    setImmediate(async () => {
      try {
        await this.cacheService.invalidateProductLists();
      } catch (error) {
        console.warn('Async product list invalidation failed:', error);
      }
    });
  }

  /**
   * Async re-cache product after update
   */
  async reCacheProduct(product: Product): Promise<void> {
    if (!productConfig.asyncCacheEnabled) {
      return;
    }

    setImmediate(async () => {
      try {
        await this.cacheService.cacheProduct(product, { useHash: true });

        if (productConfig.enableProductListInvalidation) {
          await this.cacheService.invalidateProductLists();
        }
      } catch (error) {
        console.warn('Async re-cache failed:', error);
      }
    });
  }
}

export default AsyncCacheService;
