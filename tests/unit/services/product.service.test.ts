import { Repository, SelectQueryBuilder } from 'typeorm';
import { ProductService, ProductCreateData, ProductUpdateData, ProductQueryOptions } from '../../../src/services/product.service';
import { Product } from '../../../src/models/product.entity';
import { AppDataSource } from '../../../src/config';
import { RedisCacheService } from '../../../src/services/redis-cache.service';
import { ConflictError, DatabaseError } from '../../../src/utils';
import { CACHE_CONFIG } from '../../../src/constants';

// Mock dependencies
jest.mock('../../../src/config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/redis-cache.service', () => ({
  RedisCacheService: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../src/constants', () => ({
  CACHE_CONFIG: {
    PRODUCTS_KEY_PREFIX: 'product',
    PRODUCTS_TTL: 300,
  },
  PAGINATION_CONFIG: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockRepository: jest.Mocked<Repository<Product>>;
  let mockCacheService: jest.Mocked<RedisCacheService>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Product>>;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    price: 99.99,
    category: 'Electronics',
  };

  const mockProductList = [mockProduct];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock query builder
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as any;

    // Mock repository
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    // Mock cache service
    mockCacheService = {
      cacheProduct: jest.fn(),
      invalidateProductLists: jest.fn(),
      getCachedProducts: jest.fn(),
      cacheProducts: jest.fn(),
      getCachedProduct: jest.fn(),
      updateProductHash: jest.fn(),
      invalidateProduct: jest.fn(),
      healthCheck: jest.fn(),
      getCacheStats: jest.fn(),
    } as any;

    // Setup mocks
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    (RedisCacheService.getInstance as jest.Mock).mockReturnValue(mockCacheService);

    // Create service instance
    productService = new ProductService();

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createProduct', () => {
    const createData: ProductCreateData = {
      name: 'New Product',
      price: 199.99,
      category: 'Books',
    };

    it('should create and return a new product', async () => {
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);
      mockCacheService.cacheProduct.mockResolvedValue(undefined);
      mockCacheService.invalidateProductLists.mockResolvedValue(undefined);

      const result = await productService.createProduct(createData);

      expect(mockRepository.create).toHaveBeenCalledWith(createData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(mockCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(mockCacheService.invalidateProductLists).toHaveBeenCalled();
      expect(result).toBe(mockProduct);
    });

    it('should handle cache failure gracefully during creation', async () => {
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);
      mockCacheService.cacheProduct.mockRejectedValue(new Error('Cache error'));

      const result = await productService.createProduct(createData);

      expect(result).toBe(mockProduct);
      expect(console.warn).toHaveBeenCalledWith('Cache operation failed during product creation:', expect.any(Error));
    });

    it('should throw ConflictError for duplicate product name', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockRejectedValue(duplicateError);

      await expect(productService.createProduct(createData)).rejects.toThrow(ConflictError);
      await expect(productService.createProduct(createData)).rejects.toThrow("Product with name 'New Product' already exists");
    });

    it('should throw DatabaseError for other database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockRejectedValue(dbError);

      await expect(productService.createProduct(createData)).rejects.toThrow(DatabaseError);
      await expect(productService.createProduct(createData)).rejects.toThrow('Could not create product due to a database error');
    });
  });

  describe('getProducts', () => {
    const options: ProductQueryOptions = {
      page: 1,
      limit: 10,
      category: 'Electronics',
      name: 'Test',
    };

    it('should return cached products if cache hit', async () => {
      mockCacheService.getCachedProducts.mockResolvedValue(mockProductList);

      const result = await productService.getProducts(options);

      expect(mockCacheService.getCachedProducts).toHaveBeenCalled();
      expect(result).toEqual({
        products: mockProductList,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      mockCacheService.getCachedProducts.mockResolvedValue(null);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);
      mockCacheService.cacheProducts.mockResolvedValue(undefined);

      const result = await productService.getProducts(options);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(mockCacheService.cacheProducts).toHaveBeenCalled();
      expect(result).toEqual({
        products: mockProductList,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle cache read failure gracefully', async () => {
      mockCacheService.getCachedProducts.mockRejectedValue(new Error('Cache error'));
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      const result = await productService.getProducts(options);

      expect(console.warn).toHaveBeenCalledWith('Cache read failed for product list:', expect.any(Error));
      expect(result.products).toEqual(mockProductList);
    });

    it('should use default pagination values', async () => {
      mockCacheService.getCachedProducts.mockResolvedValue(null);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      await productService.getProducts({});

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (1-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10); // DEFAULT_LIMIT
    });

    it('should limit pagination to MAX_LIMIT', async () => {
      mockCacheService.getCachedProducts.mockResolvedValue(null);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      await productService.getProducts({ limit: 200 });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100); // MAX_LIMIT
    });

    it('should throw DatabaseError for database errors', async () => {
      mockCacheService.getCachedProducts.mockResolvedValue(null);
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('DB error'));

      await expect(productService.getProducts(options)).rejects.toThrow(DatabaseError);
      await expect(productService.getProducts(options)).rejects.toThrow('Could not retrieve product list due to a database error');
    });
  });

  describe('getProductById', () => {
    const productId = 1;

    it('should return cached product if cache hit', async () => {
      mockCacheService.getCachedProduct.mockResolvedValue(mockProduct);

      const result = await productService.getProductById(productId);

      expect(mockCacheService.getCachedProduct).toHaveBeenCalledWith(productId, { useHash: true });
      expect(result).toBe(mockProduct);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss and cache the result', async () => {
      mockCacheService.getCachedProduct.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheService.cacheProduct.mockResolvedValue(undefined);

      const result = await productService.getProductById(productId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: productId } });
      expect(mockCacheService.cacheProduct).toHaveBeenCalledWith(mockProduct, {
        useHash: true,
        ttl: CACHE_CONFIG.PRODUCTS_TTL,
      });
      expect(result).toBe(mockProduct);
    });

    it('should return null if product not found', async () => {
      mockCacheService.getCachedProduct.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      const result = await productService.getProductById(productId);

      expect(result).toBeNull();
      expect(mockCacheService.cacheProduct).not.toHaveBeenCalled();
    });

    it('should handle cache read failure gracefully', async () => {
      mockCacheService.getCachedProduct.mockRejectedValue(new Error('Cache error'));
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await productService.getProductById(productId);

      expect(console.warn).toHaveBeenCalledWith(`Cache read failed for product ID ${productId}:`, expect.any(Error));
      expect(result).toBe(mockProduct);
    });

    it('should handle cache write failure gracefully', async () => {
      mockCacheService.getCachedProduct.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockCacheService.cacheProduct.mockRejectedValue(new Error('Cache error'));

      const result = await productService.getProductById(productId);

      expect(console.warn).toHaveBeenCalledWith(`Cache write failed for product ID ${productId}:`, expect.any(Error));
      expect(result).toBe(mockProduct);
    });

    it('should throw DatabaseError for database errors', async () => {
      mockCacheService.getCachedProduct.mockResolvedValue(null);
      mockRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(productService.getProductById(productId)).rejects.toThrow(DatabaseError);
      await expect(productService.getProductById(productId)).rejects.toThrow('Could not retrieve product due to a database error');
    });
  });

  describe('updateProduct', () => {
    const productId = 1;
    const updateData: ProductUpdateData = {
      name: 'Updated Product',
      price: 299.99,
    };

    it('should update and return the product', async () => {
      const updatedProduct = { ...mockProduct, ...updateData };
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(updatedProduct);
      mockCacheService.updateProductHash.mockResolvedValue(undefined);
      mockCacheService.invalidateProductLists.mockResolvedValue(undefined);

      const result = await productService.updateProduct(productId, updateData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: productId } });
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(mockCacheService.updateProductHash).toHaveBeenCalledWith(productId, updatedProduct);
      expect(mockCacheService.invalidateProductLists).toHaveBeenCalled();
      expect(result).toBe(updatedProduct);
    });

    it('should return null if product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await productService.updateProduct(productId, updateData);

      expect(result).toBeNull();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle cache failure gracefully during update', async () => {
      const updatedProduct = { ...mockProduct, ...updateData };
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(updatedProduct);
      mockCacheService.updateProductHash.mockRejectedValue(new Error('Cache error'));

      const result = await productService.updateProduct(productId, updateData);

      expect(console.warn).toHaveBeenCalledWith('Cache operation failed during product update:', expect.any(Error));
      expect(result).toBe(updatedProduct);
    });

    it('should throw ConflictError for duplicate product name', async () => {
      const duplicateError = { code: '23505', message: 'duplicate key value' };
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockRejectedValue(duplicateError);

      await expect(productService.updateProduct(productId, updateData)).rejects.toThrow(ConflictError);
    });

    it('should throw DatabaseError for other database errors', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(productService.updateProduct(productId, updateData)).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteProduct', () => {
    const productId = 1;

    it('should delete product and return true', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      mockCacheService.invalidateProduct.mockResolvedValue(undefined);
      mockCacheService.invalidateProductLists.mockResolvedValue(undefined);

      const result = await productService.deleteProduct(productId);

      expect(mockRepository.delete).toHaveBeenCalledWith(productId);
      expect(mockCacheService.invalidateProduct).toHaveBeenCalledWith(productId);
      expect(mockCacheService.invalidateProductLists).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if no product was deleted', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await productService.deleteProduct(productId);

      expect(result).toBe(false);
      expect(mockCacheService.invalidateProduct).not.toHaveBeenCalled();
    });

    it('should handle cache failure gracefully during deletion', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      mockCacheService.invalidateProduct.mockRejectedValue(new Error('Cache error'));

      const result = await productService.deleteProduct(productId);

      expect(console.warn).toHaveBeenCalledWith('Cache operation failed during product deletion:', expect.any(Error));
      expect(result).toBe(true);
    });

    it('should throw DatabaseError for database errors', async () => {
      mockRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(productService.deleteProduct(productId)).rejects.toThrow(DatabaseError);
      await expect(productService.deleteProduct(productId)).rejects.toThrow('Could not delete product due to a database error');
    });
  });

  describe('searchProducts', () => {
    const searchTerm = 'test';
    const options: ProductQueryOptions = {
      page: 1,
      limit: 10,
      category: 'Electronics',
    };

    it('should search products and return results', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      const result = await productService.searchProducts(searchTerm, options);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.name ILIKE :searchTerm', { searchTerm: '%test%' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.category = :category', { category: 'Electronics' });
      expect(result).toEqual({
        products: mockProductList,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should search without category filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      await productService.searchProducts(searchTerm, { page: 1, limit: 10 });

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should use default pagination values', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

      await productService.searchProducts(searchTerm);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should throw DatabaseError for database errors', async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('DB error'));

      await expect(productService.searchProducts(searchTerm, options)).rejects.toThrow(DatabaseError);
      await expect(productService.searchProducts(searchTerm, options)).rejects.toThrow('Could not search for products due to a database error');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status with stats', async () => {
      const cacheHealth = { 
        status: 'healthy' as const, 
        latency: 5, 
        stats: { hits: 85, misses: 15, operations: 100, errors: 0, retries: 0, hitRate: 0.85 }, 
        errors: [] 
      };
      const cacheStats = { hits: 85, misses: 15, hitRate: 0.85, operations: 100, errors: 0, retries: 0 };
      
      mockRepository.count.mockResolvedValue(42);
      mockCacheService.healthCheck.mockResolvedValue(cacheHealth);
      mockCacheService.getCacheStats.mockReturnValue(cacheStats);

      const result = await productService.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        stats: {
          totalProducts: 42,
          cache: {
            status: 'healthy',
            latency: 5,
            hitRate: 0.85,
            operations: 100,
            errors: 0,
            retries: 0,
          },
        },
      });
    });

    it('should return degraded status when cache is unhealthy', async () => {
      const cacheHealth = { status: 'unhealthy' as const, latency: 0, stats: { hits: 0, misses: 0, operations: 0, errors: 1, retries: 0, hitRate: 0 }, errors: ['Cache unavailable'] };
      const cacheStats = { hits: 0, misses: 0, hitRate: 0, operations: 0, errors: 1, retries: 0 };
      
      mockRepository.count.mockResolvedValue(42);
      mockCacheService.healthCheck.mockResolvedValue(cacheHealth);
      mockCacheService.getCacheStats.mockReturnValue(cacheStats);

      const result = await productService.healthCheck();

      expect(result.status).toBe('degraded');
      expect((result.stats as any).cache.status).toBe('unhealthy');
    });

    it('should handle cache service failure', async () => {
      mockRepository.count.mockResolvedValue(42);
      mockCacheService.healthCheck.mockRejectedValue(new Error('Cache unavailable'));

      const result = await productService.healthCheck();

      expect(result.status).toBe('degraded');
      expect((result.stats as any).cache.status).toBe('unhealthy');
    });

    it('should return unhealthy status for database errors', async () => {
      mockRepository.count.mockRejectedValue(new Error('DB error'));

      const result = await productService.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        stats: {
          error: 'DB error',
          cache: { status: 'unknown' },
        },
      });
    });
  });

  describe('integration tests', () => {
    describe('query building behavior', () => {
      it('should build query with category filter when getting products', async () => {
        mockCacheService.getCachedProducts.mockResolvedValue(null);
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

        await productService.getProducts({ category: 'Electronics' });

        expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('product');
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.category = :category', { category: 'Electronics' });
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.id', 'DESC');
      });

      it('should build query with name filter when getting products', async () => {
        mockCacheService.getCachedProducts.mockResolvedValue(null);
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

        await productService.getProducts({ name: 'test' });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.name ILIKE :name', { name: '%test%' });
      });

      it('should build query with both filters when getting products', async () => {
        mockCacheService.getCachedProducts.mockResolvedValue(null);
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockProductList, 1]);

        await productService.getProducts({ category: 'Electronics', name: 'test' });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.category = :category', { category: 'Electronics' });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.name ILIKE :name', { name: '%test%' });
      });
    });

    describe('generateProductsCacheKey', () => {
      it('should generate cache key with all parameters', () => {
        const key = (productService as any).generateProductsCacheKey(1, 10, 'Electronics', 'test');
        
        expect(key).toBe('product:list:1:10:Electronics:test');
      });

      it('should generate cache key with empty optional parameters', () => {
        const key = (productService as any).generateProductsCacheKey(2, 20);
        
        expect(key).toBe('product:list:2:20::');
      });
    });
  });
});