import { RedisClientType } from 'redis';
import { RedisCacheService } from '../../../src/services/redis-cache.service';
import { Product } from '../../../src/models/product.entity';
import RedisConnection from '../../../src/config/redis.config';
import { CacheOperationError, delay } from '../../../src/utils';

// Mock dependencies
jest.mock('../../../src/config/redis.config');
jest.mock('../../../src/utils', () => ({
  ...jest.requireActual('../../../src/utils'),
  delay: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/config/cache.config', () => ({
  defaultTTL: 300,
  productTTL: 600,
  productListTTL: 180,
}));

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;
  let mockRedisClient: jest.Mocked<RedisClientType>;
  let mockRedisConnection: jest.Mocked<RedisConnection>;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    price: 99.99,
    category: 'Electronics',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis client
    mockRedisClient = {
      hSet: jest.fn(),
      hGetAll: jest.fn(),
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
      scan: jest.fn(),
      set: jest.fn(),
    } as any;

    // Mock Redis connection
    mockRedisConnection = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      isClientConnected: jest.fn().mockReturnValue(true),
      getInstance: jest.fn(),
    } as any;

    (RedisConnection.getInstance as jest.Mock).mockReturnValue(mockRedisConnection);

    // Create service instance
    cacheService = RedisCacheService.getInstance();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset singleton instance for testing
    (RedisCacheService as any).instance = undefined;
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RedisCacheService.getInstance();
      const instance2 = RedisCacheService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create new instance with custom redis connection', () => {
      const customConnection = {} as RedisConnection;
      const instance = RedisCacheService.getInstance(customConnection);
      
      expect(instance).toBeInstanceOf(RedisCacheService);
    });
  });

  describe('cacheProduct', () => {
    it('should cache product using hash structure by default', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct);

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'products_hash:1',
        expect.objectContaining({
          id: '1',
          name: 'Test Product',
          price: '99.99',
          category: 'Electronics',
          cachedAt: expect.any(String),
        })
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith('products_hash:1', 600);
    });

    it('should cache product using string structure when useHash is false', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheProduct(mockProduct, { useHash: false });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'product:single:1',
        600,
        JSON.stringify(mockProduct)
      );
    });

    it('should use custom TTL when provided', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct, { ttl: 1800 });

      expect(mockRedisClient.expire).toHaveBeenCalledWith('products_hash:1', 1800);
    });

    it('should use custom prefix when provided', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct, { prefix: 'custom' });

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'custom:1',
        expect.any(Object)
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      mockRedisClient.hSet
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct);

      expect(mockRedisClient.hSet).toHaveBeenCalledTimes(2);
      expect(delay).toHaveBeenCalledWith(100);
    });

    it('should throw CacheOperationError after max retries', async () => {
      mockRedisClient.hSet.mockRejectedValue(new Error('Persistent error'));

      await expect(cacheService.cacheProduct(mockProduct)).rejects.toThrow(CacheOperationError);
    });

    it('should throw CacheOperationError when not connected after retries', async () => {
      mockRedisConnection.isClientConnected.mockReturnValue(false);

      await expect(cacheService.cacheProduct(mockProduct)).rejects.toThrow(CacheOperationError);
    });
  });

  describe('getCachedProduct', () => {
    it('should retrieve product from hash cache and update stats', async () => {
      const productHash = {
        id: '1',
        name: 'Test Product',
        price: '99.99',
        category: 'Electronics',
        cachedAt: new Date().toISOString(),
      };
      mockRedisClient.hGetAll.mockResolvedValue(productHash);

      const result = await cacheService.getCachedProduct(1);

      expect(mockRedisClient.hGetAll).toHaveBeenCalledWith('products_hash:1');
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics',
      }));

      const stats = cacheService.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.operations).toBe(1);
    });

    it('should retrieve product from string cache when useHash is false', async () => {
      // Create a version of mockProduct with string dates (as they would be after JSON.parse)
      const productWithStringDates = {
        ...mockProduct,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(productWithStringDates));

      const result = await cacheService.getCachedProduct(1, { useHash: false });

      expect(mockRedisClient.get).toHaveBeenCalledWith('product:single:1');
      expect(result).toEqual(productWithStringDates);
    });

    it('should return null and update miss stats when not found', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});

      const result = await cacheService.getCachedProduct(1);

      expect(result).toBeNull();
      
      const stats = cacheService.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should validate hash data and throw error for invalid data', async () => {
      const invalidHash = { id: 'invalid', name: 'Test' }; // Missing required fields
      mockRedisClient.hGetAll.mockResolvedValue(invalidHash);

      await expect(cacheService.getCachedProduct(1)).rejects.toThrow('Invalid product hash data');
    });

    it('should validate numeric fields in hash data', async () => {
      const invalidHash = {
        id: 'not-a-number',
        name: 'Test Product',
        price: '99.99',
        category: 'Electronics',
      };
      mockRedisClient.hGetAll.mockResolvedValue(invalidHash);

      await expect(cacheService.getCachedProduct(1)).rejects.toThrow('Invalid product hash data');
    });
  });

  describe('cacheProducts', () => {
    const products = [mockProduct];
    const cacheKey = 'test-key';

    it('should cache product list with generated key', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheProducts(products, cacheKey);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'product:list:test-key',
        180,
        JSON.stringify(products)
      );
    });

    it('should use custom TTL for product list', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheProducts(products, cacheKey, { ttl: 300 });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'product:list:test-key',
        300,
        JSON.stringify(products)
      );
    });
  });

  describe('getCachedProducts', () => {
    const cacheKey = 'test-key';

    it('should retrieve cached product list', async () => {
      // Create products with string dates (as they would be after JSON.parse)
      const productsWithStringDates = [{
        ...mockProduct,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }];
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(productsWithStringDates));

      const result = await cacheService.getCachedProducts(cacheKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith('product:list:test-key');
      expect(result).toEqual(productsWithStringDates);
    });

    it('should return null when list not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getCachedProducts(cacheKey);

      expect(result).toBeNull();
    });
  });

  describe('invalidateProduct', () => {
    it('should delete both hash and string keys', async () => {
      mockRedisClient.del.mockResolvedValue(2);

      await cacheService.invalidateProduct(1);

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'products_hash:1',
        'product:single:1',
      ]);
    });

    it('should use custom prefix when provided', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.invalidateProduct(1, { prefix: 'custom' });

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'custom:1',
        'custom:single:1',
      ]);
    });
  });

  describe('invalidateProductLists', () => {
    it('should scan and delete matching list keys', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce({ cursor: 0, keys: ['product:list:key1', 'product:list:key2'] })
        .mockResolvedValueOnce({ cursor: 0, keys: ['products_list:key3'] });
      mockRedisClient.del.mockResolvedValue(3);

      await cacheService.invalidateProductLists();

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['product:list:key1', 'product:list:key2']);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['products_list:key3']);
    });

    it('should handle empty scan results', async () => {
      mockRedisClient.scan.mockResolvedValue({ cursor: 0, keys: [] });

      await cacheService.invalidateProductLists();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('updateProductHash', () => {
    it('should update specific fields in hash', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);

      const updates = { name: 'Updated Name', price: 199.99 };
      await cacheService.updateProductHash(1, updates);

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'products_hash:1',
        expect.objectContaining({
          name: 'Updated Name',
          price: '199.99',
          cachedAt: expect.any(String),
        })
      );
    });

    it('should only update provided fields', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);

      await cacheService.updateProductHash(1, { name: 'New Name' });

      const setCall = mockRedisClient.hSet.mock.calls[0][1];
      expect(setCall).toHaveProperty('name', 'New Name');
      expect(setCall).not.toHaveProperty('price');
      expect(setCall).not.toHaveProperty('category');
      expect(setCall).toHaveProperty('cachedAt');
    });

    it('should only set cachedAt when no other updates provided', async () => {
      mockRedisClient.hSet.mockResolvedValue(1);

      await cacheService.updateProductHash(1, {});

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        'products_hash:1',
        expect.objectContaining({
          cachedAt: expect.any(String),
        })
      );
      
      // Verify only cachedAt is set
      const setCall = mockRedisClient.hSet.mock.calls[0][1];
      expect(Object.keys(setCall)).toEqual(['cachedAt']);
    });
  });

  describe('getCacheStats', () => {
    it('should return current cache statistics', () => {
      const stats = cacheService.getCacheStats();

      expect(stats).toEqual(expect.objectContaining({
        hits: expect.any(Number),
        misses: expect.any(Number),
        operations: expect.any(Number),
        errors: expect.any(Number),
        retries: expect.any(Number),
        hitRate: expect.any(Number),
      }));
    });

    it('should calculate hit rate correctly', async () => {
      // Simulate some cache operations
      mockRedisClient.hGetAll.mockResolvedValueOnce({ id: '1', name: 'test', price: '10', category: 'test' });
      mockRedisClient.hGetAll.mockResolvedValueOnce({});

      await cacheService.getCachedProduct(1); // Hit
      await cacheService.getCachedProduct(2); // Miss

      const stats = cacheService.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.operations).toBe(2);
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all operations succeed', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test');
      mockRedisClient.del.mockResolvedValue(1);

      // Add a small delay to ensure measurable latency
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1005);

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
      expect(result.stats).toBeDefined();
    });

    it('should return unhealthy status when basic operations fail', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('wrong-value');
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.errors).toContain('Basic cache operations failed');
    });

    it('should return unhealthy status when connection fails', async () => {
      mockRedisConnection.isClientConnected.mockReturnValue(false);

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle redis operation errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.errors[0]).toContain('Health check failed');
    });
  });

  describe('private methods', () => {
    describe('key generation', () => {
      it('should generate correct cache keys', () => {
        const service = cacheService as any;
        
        expect(service.generateKey('test')).toBe('product:test');
        expect(service.generateKey('test', 'custom')).toBe('custom:test');
        expect(service.generateHashKey(1)).toBe('products_hash:1');
        expect(service.generateHashKey(1, 'custom')).toBe('custom:1');
      });
    });

    describe('TTL methods', () => {
      it('should return correct TTL values', () => {
        const service = cacheService as any;
        
        expect(service.getProductTTL()).toBe(600);
        expect(service.getProductTTL(300)).toBe(300);
        expect(service.getProductListTTL()).toBe(180);
        expect(service.getProductListTTL(500)).toBe(500);
      });
    });

    describe('reconstructProductFromHash', () => {
      it('should reconstruct valid product from hash', () => {
        const service = cacheService as any;
        const hash = {
          id: '1',
          name: '  Test Product  ',
          price: '99.99',
          category: '  Electronics  ',
        };

        const product = service.reconstructProductFromHash(hash);

        expect(product).toEqual({
          id: 1,
          name: 'Test Product',
          price: 99.99,
          category: 'Electronics',
        });
      });

      it('should throw error for missing required fields', () => {
        const service = cacheService as any;
        const invalidHash = { id: '1', name: 'Test' }; // Missing price and category

        expect(() => service.reconstructProductFromHash(invalidHash))
          .toThrow('Invalid product hash data: missing required fields');
      });

      it('should throw error for invalid ID', () => {
        const service = cacheService as any;
        const invalidHash = {
          id: 'not-a-number',
          name: 'Test',
          price: '99.99',
          category: 'Electronics',
        };

        expect(() => service.reconstructProductFromHash(invalidHash))
          .toThrow('Invalid product hash data: invalid ID');
      });

      it('should throw error for invalid price', () => {
        const service = cacheService as any;
        const invalidHash = {
          id: '1',
          name: 'Test',
          price: 'not-a-number',
          category: 'Electronics',
        };

        expect(() => service.reconstructProductFromHash(invalidHash))
          .toThrow('Invalid product hash data: invalid price');
      });
    });

    describe('updateStats', () => {
      it('should update statistics correctly', () => {
        const service = cacheService as any;
        
        // Simulate operations
        service.updateStats(true); // Hit
        service.updateStats(false); // Miss
        service.updateStats(false, true); // Miss with error
        service.updateStats(true, false, true); // Hit with retry

        const stats = service.stats;
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(2);
        expect(stats.operations).toBe(4);
        expect(stats.errors).toBe(1);
        expect(stats.retries).toBe(1);
        expect(stats.hitRate).toBe(50);
      });
    });

    describe('scanKeys', () => {
      it('should scan all keys matching pattern', async () => {
        const service = cacheService as any;
        mockRedisClient.scan
          .mockResolvedValueOnce({ cursor: 10, keys: ['key1', 'key2'] })
          .mockResolvedValueOnce({ cursor: 0, keys: ['key3'] });

        const keys = await service.scanKeys('pattern:*');

        expect(keys).toEqual(['key1', 'key2', 'key3']);
        expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling and retry mechanism', () => {
    it('should retry with exponential backoff', async () => {
      mockRedisClient.hSet
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct);

      expect(delay).toHaveBeenCalledWith(100); // First retry
      expect(delay).toHaveBeenCalledWith(200); // Second retry
    });

    it('should update retry stats', async () => {
      mockRedisClient.hSet
        .mockRejectedValueOnce(new Error('Retry error'))
        .mockResolvedValueOnce(1);
      mockRedisClient.expire.mockResolvedValue(true);

      await cacheService.cacheProduct(mockProduct);

      const stats = cacheService.getCacheStats();
      expect(stats.retries).toBe(1);
    });
  });
});