import { Request, Response } from 'express';
import {
  ConflictError,
  DatabaseError, createErrorResponse, isPositiveInteger,
} from '../../../src/utils';
import ProductEventService from '../../../src/services/product-event.service';
import { RedisCacheService } from '../../../src/services/redis-cache.service';
import AsyncCacheService from '../../../src/services/async-cache.service';

// Mock ProductService
const mockProductServiceInstance = {
  createProduct: jest.fn(),
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  searchProducts: jest.fn(),
  healthCheck: jest.fn(),
};

jest.mock('../../../src/services', () => ({
  ProductService: jest.fn(() => mockProductServiceInstance),
}));

// Mock AsyncCacheService
const mockAsyncCacheServiceInstance = {
  cacheService: {} as any, // Add the missing cacheService property
  cacheProduct: jest.fn(),
  invalidateProductLists: jest.fn(),
  invalidateProduct: jest.fn(),
  reCacheProduct: jest.fn(),
};

jest.mock('../../../src/services/async-cache.service', () => ({
  AsyncCacheService: jest.fn(() => mockAsyncCacheServiceInstance),
}));

// Mock RedisCacheService
const mockRedisCacheServiceInstance = {
  getCachedProduct: jest.fn(),
  invalidateProduct: jest.fn(),
  invalidateProductLists: jest.fn(),
  cacheProduct: jest.fn(),
  cacheProducts: jest.fn(),
  getCachedProducts: jest.fn(),
  updateProductHash: jest.fn(),
  healthCheck: jest.fn(),
  getCacheStats: jest.fn(),
};

jest.mock('../../../src/services/redis-cache.service', () => ({
  RedisCacheService: {
    getInstance: jest.fn(() => mockRedisCacheServiceInstance),
  },
}));

// Mock ProductEventService
const mockProductEventServiceInstance = {
  emitProductCreated: jest.fn(),
  emitProductViewed: jest.fn(),
  emitProductUpdated: jest.fn(),
  emitProductDeleted: jest.fn(),
  setupEventListeners: jest.fn(),
};

jest.mock('../../../src/services/product-event.service', () => ({
  ProductEventService: {
    getInstance: jest.fn(() => mockProductEventServiceInstance),
  },
}));

// Mock the entire utils module to control its functions
jest.mock('../../../src/utils', () => ({
  __esModule: true, // This is important for default exports
  createErrorResponse: jest.fn(),
  isPositiveInteger: jest.fn(),
  // Re-export actual errors if needed, or mock them as well
  ValidationError: jest.requireActual('../../../src/utils').ValidationError,
  NotFoundError: jest.requireActual('../../../src/utils').NotFoundError,
  ConflictError: jest.requireActual('../../../src/utils').ConflictError,
  DatabaseError: jest.requireActual('../../../src/utils').DatabaseError,
}));

describe('ProductController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  // Declare controller functions here, will be assigned in beforeEach
  let createProduct: any;
  let getProducts: any;
  let getProduct: any;
  let updateProduct: any;
  let deleteProduct: any;
  let searchProducts: any;
  let getProductsHealthCheck: any;

  // Declare mock functions at the top level
  let mockCreateErrorResponse: jest.Mock;
  let mockIsPositiveInteger: jest.Mock;

  // References to the actual mock instances returned by the factories
  let productServiceMock: jest.Mocked<typeof mockProductServiceInstance>;
  let redisCacheServiceMock: jest.Mocked<RedisCacheService>;
  let asyncCacheServiceMock: jest.Mocked<AsyncCacheService>;
  let productEventServiceMock: jest.Mocked<ProductEventService>;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    price: 100.00,
    category: 'Electronics',
  };

  beforeEach(() => {
    jest.resetModules(); // Crucial: Clears the module cache

    // Reset mocks on the *instances* for each test
    jest.clearAllMocks(); // This will clear the call history of the methods on the mock instances

    // Re-import the mocked utils functions after resetModules
    const utils = require('../../../src/utils');
    mockCreateErrorResponse = utils.createErrorResponse;
    mockIsPositiveInteger = utils.isPositiveInteger;

    // Mock createErrorResponse to return the expected flattened format
    mockCreateErrorResponse.mockImplementation((error: any) => {
      if (error.name === 'ValidationError') {
        return {
          success: false,
          message: error.message,
          code: error.code || 'VALIDATION_ERROR',
          field: error.field,
        };
      }
      if (error.name === 'ConflictError') {
        return {
          success: false,
          message: error.message,
          code: 'GENERIC_ERROR',
          field: undefined,
        };
      }
      if (error.name === 'DatabaseError') {
        return {
          success: false,
          message: error.message,
          code: 'GENERIC_ERROR',
          field: undefined,
        };
      }
      if (error.name === 'NotFoundError') {
        return {
          success: false,
          message: error.message,
          code: 'NOT_FOUND',
          field: undefined,
        };
      }
      return {
        success: false,
        message: error.message,
        code: 'GENERIC_ERROR',
        field: undefined,
      };
    });

    mockIsPositiveInteger.mockReturnValue(true);

    // Re-import the controller functions. This will cause the module-level code
    // in product.controller.ts to run again, using the mocks defined above.
    ({
      createProduct,
      getProducts,
      getProduct,
      updateProduct,
      deleteProduct,
      searchProducts,
      getProductsHealthCheck,
    } = require('../../../src/controllers/product.controller'));

    // Assign the pre-defined mock instances
      productServiceMock = mockProductServiceInstance;
      asyncCacheServiceMock = mockAsyncCacheServiceInstance as unknown as jest.Mocked<AsyncCacheService>;

      // For singletons with `getInstance`:
      // For singletons with `getInstance`:
      redisCacheServiceMock = mockRedisCacheServiceInstance as unknown as jest.Mocked<RedisCacheService>;
      productEventServiceMock = mockProductEventServiceInstance as unknown as jest.Mocked<ProductEventService>;

    // Set up default mock implementations on the retrieved mock instances
    productServiceMock.createProduct.mockResolvedValue(mockProduct);
    productServiceMock.getProducts.mockResolvedValue({ products: [mockProduct], total: 1, page: 1, limit: 10 });
    productServiceMock.getProductById.mockResolvedValue(mockProduct);
    productServiceMock.updateProduct.mockResolvedValue(mockProduct);
    productServiceMock.deleteProduct.mockResolvedValue(true);
    productServiceMock.searchProducts.mockResolvedValue({ products: [mockProduct], total: 1, page: 1, limit: 10 });
    productServiceMock.healthCheck.mockResolvedValue({ status: 'healthy', database: 'connected' });

    redisCacheServiceMock.getCachedProduct.mockResolvedValue(null);
    asyncCacheServiceMock.cacheProduct.mockResolvedValue(undefined);
    asyncCacheServiceMock.invalidateProductLists.mockResolvedValue(undefined);
    asyncCacheServiceMock.invalidateProduct.mockResolvedValue(undefined);
    asyncCacheServiceMock.reCacheProduct.mockResolvedValue(undefined);
    productEventServiceMock.emitProductCreated.mockReturnValue(undefined);
    productEventServiceMock.emitProductViewed.mockReturnValue(undefined);
    productEventServiceMock.emitProductUpdated.mockReturnValue(undefined);
    productEventServiceMock.emitProductDeleted.mockReturnValue(undefined);
    productEventServiceMock.setupEventListeners.mockReturnValue(undefined);

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock console.error and console.warn to prevent actual logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product and return 201', async () => {
      mockRequest.body = { name: 'New Product', price: 50, category: 'Books' };

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.createProduct).toHaveBeenCalledWith(mockRequest.body);
      expect(asyncCacheServiceMock.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(asyncCacheServiceMock.invalidateProductLists).toHaveBeenCalled();
      expect(productEventServiceMock.emitProductCreated).toHaveBeenCalledWith(mockProduct);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product created successfully',
        data: mockProduct,
      });
    });

    it('should handle ConflictError', async () => {
      // Get the ConflictError from the controller's utils module
      const { ConflictError: ControllerConflictError } = require('../../../src/utils');
      const error = new ControllerConflictError('Product already exists');
      mockRequest.body = { name: 'Test Product', price: 100, category: 'Electronics' };
      productServiceMock.createProduct.mockImplementation(() => {
        throw error;
      });

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.createProduct).toHaveBeenCalledWith(mockRequest.body);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Product already exists',
        code: 'GENERIC_ERROR',
        field: undefined,
      });
    });

    it('should handle DatabaseError', async () => {
      const error = new DatabaseError('DB connection failed', 'create');
      mockRequest.body = { name: 'Test Product', price: 100, category: 'Electronics' };
      productServiceMock.createProduct.mockRejectedValueOnce(error);

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB connection failed',
        code: 'GENERIC_ERROR',
        field: undefined,
      });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Something went wrong');
      mockRequest.body = { name: 'Test Product', price: 100, category: 'Electronics' };
      productServiceMock.createProduct.mockRejectedValueOnce(error);

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { price: 50, category: 'Books' }; // Missing name

      await createProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Validation failed'),
        code: 'VALIDATION_ERROR',
      }));
    });
  });

  describe('getProducts', () => {
    it('should retrieve products with default query params', async () => {
      mockRequest.query = {};

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: undefined,
        name: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Products retrieved successfully',
        data: { products: [mockProduct], total: 1, page: 1, limit: 10 },
      });
    });

    it('should retrieve products with custom query params', async () => {
      mockRequest.query = { page: '2', limit: '5', category: 'Books', name: 'Test' };

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        category: 'Books',
        name: 'Test',
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Products retrieved successfully',
        data: { products: [mockProduct], total: 1, page: 1, limit: 10 },
      });
    });

    it('should cap limit at maxLimit', async () => {
      mockRequest.query = { limit: '200' };

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.getProducts).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
      }));
    });

    it('should handle DatabaseError', async () => {
      const error = new DatabaseError('DB error', 'read');
      mockRequest.query = { page: '1', limit: '10' };
      productServiceMock.getProducts.mockRejectedValueOnce(error);

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unknown error');
      productServiceMock.getProducts.mockRejectedValueOnce(error);

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('should return 400 for invalid page or limit parameters', async () => {
      mockRequest.query = { page: '-1', limit: 'abc' };
      mockIsPositiveInteger.mockImplementation((value) => value > 0);

      await getProducts(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Invalid query parameters'),
        code: 'INVALID_FORMAT',
      }));
    });
  });

  describe('getProduct', () => {
    it('should retrieve product from cache', async () => {
      mockRequest.params = { id: '1' };
      redisCacheServiceMock.getCachedProduct.mockResolvedValueOnce(mockProduct);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(redisCacheServiceMock.getCachedProduct).toHaveBeenCalledWith(1, { useHash: true });
      expect(productServiceMock.getProductById).not.toHaveBeenCalled();
      expect(asyncCacheServiceMock.cacheProduct).not.toHaveBeenCalled();
      expect(productEventServiceMock.emitProductViewed).toHaveBeenCalledWith(mockProduct.id);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product retrieved successfully',
        data: mockProduct,
      });
    });

    it('should retrieve product from DB if cache miss and then cache it', async () => {
      mockRequest.params = { id: '1' };
      redisCacheServiceMock.getCachedProduct.mockResolvedValueOnce(null);
      productServiceMock.getProductById.mockResolvedValueOnce(mockProduct);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(redisCacheServiceMock.getCachedProduct).toHaveBeenCalledWith(1, { useHash: true });
      expect(productServiceMock.getProductById).toHaveBeenCalledWith(1);
      expect(asyncCacheServiceMock.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(productEventServiceMock.emitProductViewed).toHaveBeenCalledWith(mockProduct.id);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product retrieved successfully',
        data: mockProduct,
      });
    });

    it('should handle cache read failure gracefully and fetch from DB', async () => {
      mockRequest.params = { id: '1' };
      redisCacheServiceMock.getCachedProduct.mockRejectedValueOnce(new Error('Cache error'));
      productServiceMock.getProductById.mockResolvedValueOnce(mockProduct);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(console.warn).toHaveBeenCalledWith('Cache read failed:', expect.any(Error));
      expect(productServiceMock.getProductById).toHaveBeenCalledWith(1);
      expect(asyncCacheServiceMock.cacheProduct).toHaveBeenCalledWith(mockProduct, { useHash: true });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product retrieved successfully',
        data: mockProduct,
      });
    });

    it('should return 400 for invalid product ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockIsPositiveInteger.mockReturnValueOnce(false);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(mockIsPositiveInteger).toHaveBeenCalledWith(NaN);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID must be a positive integer',
        code: 'INVALID_FORMAT',
        field: 'id',
      });
    });

    it('should return 404 if product not found in DB', async () => {
      mockRequest.params = { id: '999' };
      redisCacheServiceMock.getCachedProduct.mockResolvedValueOnce(null);
      productServiceMock.getProductById.mockResolvedValueOnce(null);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.getProductById).toHaveBeenCalledWith(999);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'NotFoundError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Product with identifier '999' not found",
        code: 'NOT_FOUND',
        field: undefined,
      });
    });

    it('should handle generic errors', async () => {
      mockRequest.params = { id: '1' };
      const error = new Error('Unknown error');
      productServiceMock.getProductById.mockRejectedValueOnce(error);

      await getProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('updateProduct', () => {
    it('should update a product and return success', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { name: 'Updated Product', price: 120 };

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.updateProduct).toHaveBeenCalledWith(1, mockRequest.body);
      expect(asyncCacheServiceMock.invalidateProduct).toHaveBeenCalledWith(1);
      expect(asyncCacheServiceMock.reCacheProduct).toHaveBeenCalledWith(mockProduct);
      expect(productEventServiceMock.emitProductUpdated).toHaveBeenCalledWith(mockProduct);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product updated successfully',
        data: mockProduct,
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.params = { id: '999' };
      productServiceMock.updateProduct.mockResolvedValueOnce(null);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'NotFoundError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle ConflictError', async () => {
      mockRequest.params = { id: '1' };
      const error = new ConflictError('Product name taken');
      productServiceMock.updateProduct.mockRejectedValueOnce(error);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(409);
    });

    it('should handle DatabaseError', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { name: 'Updated Product', price: 120 };
      const error = new DatabaseError('DB update failed', 'update');
      productServiceMock.updateProduct.mockRejectedValueOnce(error);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic errors', async () => {
      mockRequest.params = { id: '1' };
      const error = new Error('Unknown error');
      productServiceMock.updateProduct.mockRejectedValueOnce(error);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('should return 400 for invalid product ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockRequest.body = { name: 'Updated Product' };
      mockIsPositiveInteger.mockReturnValueOnce(false);

      await updateProduct(mockRequest as Request, mockResponse as Response);

      expect(mockIsPositiveInteger).toHaveBeenCalledWith(NaN);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID must be a positive integer',
        code: 'INVALID_FORMAT',
        field: 'id',
      });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product and return success', async () => {
      mockRequest.params = { id: '1' };

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.deleteProduct).toHaveBeenCalledWith(1);
      expect(asyncCacheServiceMock.invalidateProduct).toHaveBeenCalledWith(1);
      expect(asyncCacheServiceMock.invalidateProductLists).toHaveBeenCalled();
      expect(productEventServiceMock.emitProductDeleted).toHaveBeenCalledWith(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product deleted successfully',
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.params = { id: '999' };
      productServiceMock.deleteProduct.mockResolvedValueOnce(false);

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'NotFoundError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle DatabaseError', async () => {
      mockRequest.params = { id: '1' };
      const error = new DatabaseError('DB delete failed', 'delete');
      productServiceMock.deleteProduct.mockRejectedValueOnce(error);

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic errors', async () => {
      mockRequest.params = { id: '1' };
      const error = new Error('Unknown error');
      productServiceMock.deleteProduct.mockRejectedValueOnce(error);

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('should return 400 for invalid product ID', async () => {
      mockRequest.params = { id: 'abc' };
      mockIsPositiveInteger.mockReturnValueOnce(false);

      await deleteProduct(mockRequest as Request, mockResponse as Response);

      expect(mockIsPositiveInteger).toHaveBeenCalledWith(NaN);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Product ID must be a positive integer',
        code: 'INVALID_FORMAT',
        field: 'id',
      });
    });
  });

  describe('searchProducts', () => {
    it('should search products with valid term and return success', async () => {
      mockRequest.query = { q: 'test', page: '1', limit: '10' };

      await searchProducts(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.searchProducts).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        category: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Products search completed successfully',
        data: { products: [mockProduct], total: 1, page: 1, limit: 10 },
      });
    });

    it('should return 400 for search term too short', async () => {
      mockRequest.query = { q: 'te' };

      await searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search term must be at least 3 characters',
        code: 'INVALID_LENGTH',
        field: 'q',
      });
    });

    it('should handle DatabaseError', async () => {
      mockRequest.query = { q: 'test' };
      const error = new DatabaseError('DB search failed', 'search');
      productServiceMock.searchProducts.mockRejectedValueOnce(error);

      await searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic errors', async () => {
      mockRequest.query = { q: 'test' };
      const error = new Error('Unknown error');
      productServiceMock.searchProducts.mockRejectedValueOnce(error);

      await searchProducts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('getProductsHealthCheck', () => {
    it('should return product service health check status', async () => {
      await getProductsHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(productServiceMock.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product service health check completed',
        data: { status: 'healthy', database: 'connected' },
      });
    });

    it('should handle DatabaseError', async () => {
      const error = new DatabaseError('Health check DB error', 'health_check');
      productServiceMock.healthCheck.mockRejectedValueOnce(error);

      await getProductsHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle generic errors', async () => {
      const error = new Error('Health check unknown error');
      productServiceMock.healthCheck.mockRejectedValueOnce(error);

      await getProductsHealthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Health check failed',
      });
    });
  });
});
