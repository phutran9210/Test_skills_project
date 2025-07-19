import { AsyncCacheService } from '../../../src/services/async-cache.service';
import { RedisCacheService } from '../../../src/services/redis-cache.service';
import { Product } from '../../../src/models/product.entity';
import productConfig from '../../../src/config/product.config';

// Mock dependencies
jest.mock('../../../src/services/redis-cache.service');
jest.mock('../../../src/config/product.config', () => ({
  asyncCacheEnabled: true,
  enableCacheInvalidation: true,
  enableProductListInvalidation: true,
}));

describe('AsyncCacheService', () => {
  let asyncCacheService: AsyncCacheService;
  let mockRedisCacheService: jest.Mocked<RedisCacheService>;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    price: 99.99,
    category: 'Electronics',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis cache service
    mockRedisCacheService = {
      cacheProduct: jest.fn().mockResolvedValue(undefined),
      invalidateProduct: jest.fn().mockResolvedValue(undefined),
      invalidateProductLists: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock the getInstance method
    (RedisCacheService.getInstance as jest.Mock).mockReturnValue(mockRedisCacheService);

    // Create service instance
    asyncCacheService = new AsyncCacheService();

    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset product config to default values
    (productConfig as any).asyncCacheEnabled = true;
    (productConfig as any).enableCacheInvalidation = true;
    (productConfig as any).enableProductListInvalidation = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use provided cache service', () => {
      const customCacheService = {} as RedisCacheService;
      const service = new AsyncCacheService(customCacheService);

      expect(service).toBeInstanceOf(AsyncCacheService);
    });

    it('should use default cache service when none provided', () => {
      const service = new AsyncCacheService();

      expect(RedisCacheService.getInstance).toHaveBeenCalled();
      expect(service).toBeInstanceOf(AsyncCacheService);
    });
  });

  describe('cacheProduct', () => {
    it('should cache product asynchronously with default options', async () => {
      await asyncCacheService.cacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, {
        useHash: true,
      });
    });

    it('should cache product with custom useHash option', async () => {
      await asyncCacheService.cacheProduct(mockProduct, { useHash: false });

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, {
        useHash: false,
      });
    });

    it('should return immediately without caching when asyncCacheEnabled is false', async () => {
      (productConfig as any).asyncCacheEnabled = false;

      await asyncCacheService.cacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully and log warning', async () => {
      const cacheError = new Error('Cache operation failed');
      mockRedisCacheService.cacheProduct.mockRejectedValue(cacheError);

      await asyncCacheService.cacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(console.warn).toHaveBeenCalledWith('Async cache failed:', cacheError);
    });

    it('should not block execution (async behavior)', async () => {
      // Mock cacheProduct to take some time
      mockRedisCacheService.cacheProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const startTime = Date.now();
      await asyncCacheService.cacheProduct(mockProduct);
      const endTime = Date.now();

      // Should return immediately, not wait for cache operation
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('invalidateProduct', () => {
    const productId = 1;

    it('should invalidate product cache asynchronously', async () => {
      await asyncCacheService.invalidateProduct(productId);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.invalidateProduct).toHaveBeenCalledWith(productId);
    });

    it('should return immediately without invalidating when enableCacheInvalidation is false', async () => {
      (productConfig as any).enableCacheInvalidation = false;

      await asyncCacheService.invalidateProduct(productId);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.invalidateProduct).not.toHaveBeenCalled();
    });

    it('should handle invalidation errors gracefully and log warning', async () => {
      const invalidationError = new Error('Invalidation failed');
      mockRedisCacheService.invalidateProduct.mockRejectedValue(invalidationError);

      await asyncCacheService.invalidateProduct(productId);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(console.warn).toHaveBeenCalledWith('Async cache invalidation failed:', invalidationError);
    });

    it('should not block execution (async behavior)', async () => {
      // Mock invalidateProduct to take some time
      mockRedisCacheService.invalidateProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const startTime = Date.now();
      await asyncCacheService.invalidateProduct(productId);
      const endTime = Date.now();

      // Should return immediately, not wait for invalidation operation
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('invalidateProductLists', () => {
    it('should invalidate product lists asynchronously', async () => {
      await asyncCacheService.invalidateProductLists();

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalled();
    });

    it('should return immediately without invalidating when enableProductListInvalidation is false', async () => {
      (productConfig as any).enableProductListInvalidation = false;

      await asyncCacheService.invalidateProductLists();

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.invalidateProductLists).not.toHaveBeenCalled();
    });

    it('should handle list invalidation errors gracefully and log warning', async () => {
      const invalidationError = new Error('List invalidation failed');
      mockRedisCacheService.invalidateProductLists.mockRejectedValue(invalidationError);

      await asyncCacheService.invalidateProductLists();

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(console.warn).toHaveBeenCalledWith('Async product list invalidation failed:', invalidationError);
    });

    it('should not block execution (async behavior)', async () => {
      // Mock invalidateProductLists to take some time
      mockRedisCacheService.invalidateProductLists.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const startTime = Date.now();
      await asyncCacheService.invalidateProductLists();
      const endTime = Date.now();

      // Should return immediately, not wait for invalidation operation
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('reCacheProduct', () => {
    it('should re-cache product asynchronously with hash enabled', async () => {
      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
    });

    it('should invalidate product lists after re-caching when enabled', async () => {
      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalled();
    });

    it('should not invalidate product lists when enableProductListInvalidation is false', async () => {
      (productConfig as any).enableProductListInvalidation = false;

      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(mockRedisCacheService.invalidateProductLists).not.toHaveBeenCalled();
    });

    it('should return immediately without re-caching when asyncCacheEnabled is false', async () => {
      (productConfig as any).asyncCacheEnabled = false;

      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).not.toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProductLists).not.toHaveBeenCalled();
    });

    it('should handle re-cache errors gracefully and log warning', async () => {
      const reCacheError = new Error('Re-cache failed');
      mockRedisCacheService.cacheProduct.mockRejectedValue(reCacheError);

      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(console.warn).toHaveBeenCalledWith('Async re-cache failed:', reCacheError);
    });

    it('should handle list invalidation errors during re-cache', async () => {
      const listInvalidationError = new Error('List invalidation failed');
      mockRedisCacheService.invalidateProductLists.mockRejectedValue(listInvalidationError);

      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Async re-cache failed:', listInvalidationError);
    });

    it('should not block execution (async behavior)', async () => {
      // Mock cacheProduct to take some time
      mockRedisCacheService.cacheProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const startTime = Date.now();
      await asyncCacheService.reCacheProduct(mockProduct);
      const endTime = Date.now();

      // Should return immediately, not wait for re-cache operation
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('configuration-based behavior', () => {
    it('should respect all configuration flags being false', async () => {
      (productConfig as any).asyncCacheEnabled = false;
      (productConfig as any).enableCacheInvalidation = false;
      (productConfig as any).enableProductListInvalidation = false;

      await asyncCacheService.cacheProduct(mockProduct);
      await asyncCacheService.invalidateProduct(1);
      await asyncCacheService.invalidateProductLists();
      await asyncCacheService.reCacheProduct(mockProduct);

      // Wait for any setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).not.toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProduct).not.toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProductLists).not.toHaveBeenCalled();
    });

    it('should work with mixed configuration settings', async () => {
      (productConfig as any).asyncCacheEnabled = true;
      (productConfig as any).enableCacheInvalidation = false;
      (productConfig as any).enableProductListInvalidation = true;

      await asyncCacheService.cacheProduct(mockProduct);
      await asyncCacheService.invalidateProduct(1);
      await asyncCacheService.invalidateProductLists();

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProduct).not.toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors that occur during async operations without affecting main execution', async () => {
      // Make all cache operations fail
      mockRedisCacheService.cacheProduct.mockRejectedValue(new Error('Cache error'));
      mockRedisCacheService.invalidateProduct.mockRejectedValue(new Error('Invalidate error'));
      mockRedisCacheService.invalidateProductLists.mockRejectedValue(new Error('List invalidate error'));

      // All operations should complete without throwing
      await expect(asyncCacheService.cacheProduct(mockProduct)).resolves.toBeUndefined();
      await expect(asyncCacheService.invalidateProduct(1)).resolves.toBeUndefined();
      await expect(asyncCacheService.invalidateProductLists()).resolves.toBeUndefined();
      await expect(asyncCacheService.reCacheProduct(mockProduct)).resolves.toBeUndefined();

      // Wait for setImmediate to execute
      await new Promise(setImmediate);

      // All operations should have been attempted
      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProduct).toHaveBeenCalled();
      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalled();

      // Warnings should have been logged
      expect(console.warn).toHaveBeenCalledWith('Async cache failed:', expect.any(Error));
      expect(console.warn).toHaveBeenCalledWith('Async cache invalidation failed:', expect.any(Error));
      expect(console.warn).toHaveBeenCalledWith('Async product list invalidation failed:', expect.any(Error));
      expect(console.warn).toHaveBeenCalledWith('Async re-cache failed:', expect.any(Error));
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple concurrent operations', async () => {
      const products = [mockProduct, { ...mockProduct, id: 2 }, { ...mockProduct, id: 3 }];

      // Execute multiple operations concurrently
      await Promise.all([
        asyncCacheService.cacheProduct(products[0]),
        asyncCacheService.cacheProduct(products[1]),
        asyncCacheService.invalidateProduct(products[2].id),
        asyncCacheService.invalidateProductLists(),
      ]);

      // Wait for all setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledTimes(2);
      expect(mockRedisCacheService.invalidateProduct).toHaveBeenCalledTimes(1);
      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalledTimes(1);
    });

    it('should work correctly in a typical product update workflow', async () => {
      // Simulate a product update workflow
      await asyncCacheService.invalidateProduct(mockProduct.id); // Remove old cache
      await asyncCacheService.reCacheProduct(mockProduct); // Add updated product
      await asyncCacheService.invalidateProductLists(); // Clear list caches

      // Wait for all setImmediate to execute
      await new Promise(setImmediate);

      expect(mockRedisCacheService.invalidateProduct).toHaveBeenCalledWith(mockProduct.id);
      expect(mockRedisCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(mockRedisCacheService.invalidateProductLists).toHaveBeenCalledTimes(2); // Once direct, once in reCacheProduct
    });
  });
});