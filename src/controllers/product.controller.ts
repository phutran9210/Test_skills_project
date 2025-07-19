import { Request, Response } from 'express';
import { ProductService } from '../services';
import { RedisCacheService } from '../services/redis-cache.service';
import { AsyncCacheService } from '../services/async-cache.service';
import { ProductEventService } from '../services/product-event.service';
import { Product } from '../models/product.entity';
import productConfig from '../config/product.config';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  isPositiveInteger,
  createErrorResponse,
} from '../utils';

const productService = new ProductService();
const cacheService = RedisCacheService.getInstance();
const asyncCacheService = new AsyncCacheService(cacheService);
const eventService = ProductEventService.getInstance();

// Initialize event listeners
eventService.setupEventListeners();

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, price, category } = req.body || {};

    // Validate required fields
    if (!name || !price || !category) {
      throw new ValidationError(
        'Validation failed: Missing required fields',
        'body',
        'VALIDATION_ERROR',
      );
    }

    const product = await productService.createProduct({ name, price, category });

    // Async cache the new product and handle events
    await asyncCacheService.cacheProduct(product, { useHash: true });
    await asyncCacheService.invalidateProductLists();

    // Emit product created event
    eventService.emitProductCreated(product);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error: unknown) {
    console.error('Create product error:', error);

    // Handle specific error types
    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError);
      return res.status((error as ValidationError).statusCode).json(errorResponse);
    }

    if (
      error instanceof ConflictError ||
      (error instanceof Error && error.name === 'ConflictError')
    ) {
      const errorResponse = createErrorResponse(error as ConflictError);
      return res.status((error as ConflictError).statusCode).json(errorResponse);
    }

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit, category, name } = req.query;

    // Validate query parameters
    const parsedPage = page ? parseInt(page as string) : productConfig.defaultPage;
    const parsedLimit = limit ? parseInt(limit as string) : productConfig.defaultLimit;

    if (page && (!isPositiveInteger(parsedPage) || parsedPage <= 0)) {
      throw new ValidationError(
        'Invalid query parameters: page must be a positive integer',
        'page',
        'INVALID_FORMAT',
      );
    }

    if (limit && (!isPositiveInteger(parsedLimit) || parsedLimit <= 0)) {
      throw new ValidationError(
        'Invalid query parameters: limit must be a positive integer',
        'limit',
        'INVALID_FORMAT',
      );
    }

    const query = {
      page: parsedPage,
      limit: Math.min(parsedLimit, productConfig.maxLimit),
      category: category as string,
      name: name as string,
    };

    const result = await productService.getProducts(query);

    return res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error: unknown) {
    console.error('Get products error:', error);

    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError);
      return res.status((error as ValidationError).statusCode).json(errorResponse);
    }

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    if (!isPositiveInteger(productId)) {
      throw new ValidationError('Product ID must be a positive integer', 'id', 'INVALID_FORMAT');
    }

    // 1. Try Cache first ✅
    let product: Product | null = null;
    try {
      product = await cacheService.getCachedProduct(productId, { useHash: true });
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError);
    }

    // 2. If miss → Query DB ✅
    if (!product) {
      product = await productService.getProductById(productId);

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // 3. Async cache result ✅
      await asyncCacheService.cacheProduct(product!, { useHash: true });
    }

    // Emit product viewed event
    if (product) {
      eventService.emitProductViewed(product.id);
    }

    return res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error: unknown) {
    console.error('Get product error:', error);

    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError') ||
      error instanceof NotFoundError ||
      (error instanceof Error && error.name === 'NotFoundError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError | NotFoundError);
      return res.status((error as ValidationError | NotFoundError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, category } = req.body || {};
    const productId = parseInt(id);

    // Validate product ID
    if (!isPositiveInteger(productId)) {
      throw new ValidationError('Product ID must be a positive integer', 'id', 'INVALID_FORMAT');
    }

    // Update Database
    const product = await productService.updateProduct(productId, { name, price, category });

    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    // Invalidate Cache immediately
    await asyncCacheService.invalidateProduct(productId);

    // Async re-cache (don't block response)
    await asyncCacheService.reCacheProduct(product);

    // Emit events for other services
    eventService.emitProductUpdated(product);

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error: unknown) {
    console.error('Update product error:', error);

    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError);
      return res.status((error as ValidationError).statusCode).json(errorResponse);
    }

    if (
      error instanceof NotFoundError ||
      (error instanceof Error && error.name === 'NotFoundError') ||
      error instanceof ConflictError ||
      (error instanceof Error && error.name === 'ConflictError')
    ) {
      const errorResponse = createErrorResponse(error as NotFoundError | ConflictError);
      return res.status((error as NotFoundError | ConflictError).statusCode).json(errorResponse);
    }

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    // Validate product ID
    if (!isPositiveInteger(productId)) {
      throw new ValidationError('Product ID must be a positive integer', 'id', 'INVALID_FORMAT');
    }

    const deleted = await productService.deleteProduct(productId);

    if (!deleted) {
      throw new NotFoundError('Product', productId);
    }

    // Invalidate cache immediately after successful deletion
    await asyncCacheService.invalidateProduct(productId);
    await asyncCacheService.invalidateProductLists();

    // Emit product deleted event
    eventService.emitProductDeleted(productId);

    return res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete product error:', error);

    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError);
      return res.status((error as ValidationError).statusCode).json(errorResponse);
    }

    if (
      error instanceof NotFoundError ||
      (error instanceof Error && error.name === 'NotFoundError')
    ) {
      const errorResponse = createErrorResponse(error as NotFoundError);
      return res.status((error as NotFoundError).statusCode).json(errorResponse);
    }

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q: searchTerm, page, limit, category } = req.query;

    // Validate search term length
    if (
      searchTerm &&
      typeof searchTerm === 'string' &&
      searchTerm.length < productConfig.searchMinLength
    ) {
      throw new ValidationError(
        `Search term must be at least ${productConfig.searchMinLength} characters`,
        'q',
        'INVALID_LENGTH',
      );
    }

    const query = {
      page: page ? parseInt(page as string) : productConfig.defaultPage,
      limit: limit
        ? Math.min(parseInt(limit as string), productConfig.maxLimit)
        : productConfig.defaultLimit,
      category: category as string,
    };

    const result = await productService.searchProducts(searchTerm as string, query);

    return res.json({
      success: true,
      message: 'Products search completed successfully',
      data: result,
    });
  } catch (error: unknown) {
    console.error('Search products error:', error);

    if (
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'ValidationError')
    ) {
      const errorResponse = createErrorResponse(error as ValidationError);
      return res.status((error as ValidationError).statusCode).json(errorResponse);
    }

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getProductsHealthCheck = async (req: Request, res: Response) => {
  try {
    const healthCheck = await productService.healthCheck();

    return res.json({
      success: true,
      message: 'Product service health check completed',
      data: healthCheck,
    });
  } catch (error: unknown) {
    console.error('Health check error:', error);

    if (
      error instanceof DatabaseError ||
      (error instanceof Error && error.name === 'DatabaseError')
    ) {
      const errorResponse = createErrorResponse(error as DatabaseError);
      return res.status((error as DatabaseError).statusCode).json(errorResponse);
    }

    return res.status(500).json({
      success: false,
      message: 'Health check failed',
    });
  }
};
