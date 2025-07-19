import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../models/product.entity';
import { AppDataSource } from '../config';
import { CACHE_CONFIG, PAGINATION_CONFIG } from '../constants';
import { RedisCacheService } from './redis-cache.service';
import { ConflictError, DatabaseError } from '../utils';

export interface ProductCreateData {
  name: string;
  price: number;
  category: string;
}

export interface ProductUpdateData {
  name?: string;
  price?: number;
  category?: string;
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  category?: string;
  name?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductService {
  private repository: Repository<Product>;
  private cacheService: RedisCacheService;

  constructor() {
    this.repository = AppDataSource.getRepository(Product);
    this.cacheService = RedisCacheService.getInstance();
  }

  /**
   * Creates a new product.
   */
  async createProduct(data: ProductCreateData): Promise<Product> {
    try {
      const product = this.repository.create(data);
      const savedProduct = await this.repository.save(product);

      // Cache the new product using hash structure
      try {
        await this.cacheService.cacheProduct(savedProduct, { useHash: true });
        await this.cacheService.invalidateProductLists();
      } catch (cacheError) {
        console.warn('Cache operation failed during product creation:', cacheError);
        // Continue execution - cache failure shouldn't break the main operation
      }

      return savedProduct;
    } catch (error: unknown) {
      console.error('Error creating product:', error);
      if ((error as { code?: string }).code === '23505') {
        // PostgreSQL unique_violation error code
        throw new ConflictError(`Product with name '${data.name}' already exists`);
      }
      throw new DatabaseError(
        'Could not create product due to a database error',
        (error as Error).message,
      );
    }
  }

  /**
   * Retrieves a paginated and filtered list of products.
   */
  async getProducts(options: ProductQueryOptions = {}): Promise<ProductListResponse> {
    const {
      page = PAGINATION_CONFIG.DEFAULT_PAGE,
      limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
      category,
      name,
    } = options;

    // Limit the number of products per page
    const actualLimit = Math.min(limit, PAGINATION_CONFIG.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    // Generate cache key
    const cacheKey = this.generateProductsCacheKey(page, actualLimit, category, name);

    try {
      // Check cache using enhanced cache service
      try {
        const cachedResult = await this.cacheService.getCachedProducts(cacheKey);
        if (cachedResult) {
          console.log('Cache hit for product list');
          return {
            products: cachedResult,
            total: cachedResult.length,
            page,
            limit: actualLimit,
            totalPages: Math.ceil(cachedResult.length / actualLimit),
          };
        }
      } catch (cacheError) {
        console.warn('Cache read failed for product list:', cacheError);
      }

      // Build query
      const queryBuilder = this.buildProductQuery(category, name);

      // Get data with pagination
      const [products, total] = await queryBuilder.skip(skip).take(actualLimit).getManyAndCount();

      const result: ProductListResponse = {
        products,
        total,
        page,
        limit: actualLimit,
        totalPages: Math.ceil(total / actualLimit),
      };

      // Cache the result using enhanced cache service
      try {
        await this.cacheService.cacheProducts(products, cacheKey, {
          ttl: CACHE_CONFIG.PRODUCTS_TTL,
        });
        console.log('Cached product list');
      } catch (cacheError) {
        console.warn('Cache write failed for product list:', cacheError);
      }

      return result;
    } catch (error: unknown) {
      console.error('Error getting product list:', error);
      throw new DatabaseError(
        'Could not retrieve product list due to a database error',
        (error as Error).message,
      );
    }
  }

  /**
   * Retrieves a product by its ID.
   */
  async getProductById(id: number): Promise<Product | null> {
    try {
      // Check cache using enhanced cache service with hash support
      try {
        const cachedProduct = await this.cacheService.getCachedProduct(id, { useHash: true });
        if (cachedProduct) {
          console.log(`Cache hit for product ID: ${id}`);
          return cachedProduct;
        }
      } catch (cacheError) {
        console.warn(`Cache read failed for product ID ${id}:`, cacheError);
      }

      const product = await this.repository.findOne({
        where: { id },
      });

      if (product) {
        // Cache the product using hash structure
        try {
          await this.cacheService.cacheProduct(product, {
            useHash: true,
            ttl: CACHE_CONFIG.PRODUCTS_TTL,
          });
          console.log(`Cached product ID: ${id}`);
        } catch (cacheError) {
          console.warn(`Cache write failed for product ID ${id}:`, cacheError);
        }
      }

      return product;
    } catch (error: unknown) {
      console.error('Error getting product by ID:', error);
      throw new DatabaseError(
        'Could not retrieve product due to a database error',
        (error as Error).message,
      );
    }
  }

  /**
   * Updates a product.
   */
  async updateProduct(id: number, data: ProductUpdateData): Promise<Product | null> {
    try {
      const product = await this.repository.findOne({ where: { id } });
      if (!product) {
        return null;
      }

      // Update data
      Object.assign(product, data);
      const updatedProduct = await this.repository.save(product);

      // Update cache using enhanced cache service
      try {
        // Use hash-based partial update for better performance
        await this.cacheService.updateProductHash(id, updatedProduct);
        await this.cacheService.invalidateProductLists();
      } catch (cacheError) {
        console.warn('Cache operation failed during product update:', cacheError);
      }

      return updatedProduct;
    } catch (error: unknown) {
      console.error('Error updating product:', error);
      if ((error as { code?: string }).code === '23505') {
        // PostgreSQL unique_violation error code
        throw new ConflictError(`Product with name '${data.name}' already exists`);
      }
      throw new DatabaseError(
        'Could not update product due to a database error',
        (error as Error).message,
      );
    }
  }

  /**
   * Deletes a product.
   */
  async deleteProduct(id: number): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);

      if (result.affected && result.affected > 0) {
        // Clear cache using enhanced cache service
        try {
          await this.cacheService.invalidateProduct(id);
          await this.cacheService.invalidateProductLists();
        } catch (cacheError) {
          console.warn('Cache operation failed during product deletion:', cacheError);
        }
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error('Error deleting product:', error);
      throw new DatabaseError(
        'Could not delete product due to a database error',
        (error as Error).message,
      );
    }
  }

  /**
   * Searches for products.
   */
  async searchProducts(
    searchTerm: string,
    options: ProductQueryOptions = {},
  ): Promise<ProductListResponse> {
    const {
      page = PAGINATION_CONFIG.DEFAULT_PAGE,
      limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
      category,
    } = options;

    const actualLimit = Math.min(limit, PAGINATION_CONFIG.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('product')
        .where('product.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` });

      if (category) {
        queryBuilder.andWhere('product.category = :category', { category });
      }

      const [products, total] = await queryBuilder.skip(skip).take(actualLimit).getManyAndCount();

      return {
        products,
        total,
        page,
        limit: actualLimit,
        totalPages: Math.ceil(total / actualLimit),
      };
    } catch (error: unknown) {
      console.error('Error searching products:', error);
      throw new DatabaseError(
        'Could not search for products due to a database error',
        (error as Error).message,
      );
    }
  }

  // Private helper methods

  /**
   * Builds a product query.
   */
  private buildProductQuery(category?: string, name?: string): SelectQueryBuilder<Product> {
    const queryBuilder = this.repository.createQueryBuilder('product');

    if (category) {
      queryBuilder.where('product.category = :category', { category });
    }

    if (name) {
      const whereClause = category ? 'andWhere' : 'where';
      queryBuilder[whereClause]('product.name ILIKE :name', { name: `%${name}%` });
    }

    return queryBuilder.orderBy('product.id', 'DESC');
  }

  /**
   * Generates a cache key for the product list.
   */
  private generateProductsCacheKey(
    page: number,
    limit: number,
    category?: string,
    name?: string,
  ): string {
    return `${CACHE_CONFIG.PRODUCTS_KEY_PREFIX}:list:${page}:${limit}:${category || ''}:${name || ''}`;
  }

  /**
   * Health check for ProductService.
   */
  async healthCheck(): Promise<{ status: string; stats: Record<string, unknown> }> {
    try {
      const totalProducts = await this.repository.count();

      // Get cache health and stats
      let cacheHealth;
      let cacheStats;
      try {
        cacheHealth = await this.cacheService.healthCheck();
        cacheStats = this.cacheService.getCacheStats();
      } catch {
        cacheHealth = { status: 'unhealthy', errors: ['Cache service unavailable'] };
        cacheStats = { hits: 0, misses: 0, operations: 0, errors: 1, retries: 0, hitRate: 0 };
      }

      return {
        status: cacheHealth.status === 'healthy' ? 'healthy' : 'degraded',
        stats: {
          totalProducts,
          cache: {
            status: cacheHealth.status,
            latency: cacheHealth.latency,
            hitRate: cacheStats.hitRate,
            operations: cacheStats.operations,
            errors: cacheStats.errors,
            retries: cacheStats.retries,
          },
        },
      };
    } catch (error) {
      console.error('ProductService health check failed:', error);
      return {
        status: 'unhealthy',
        stats: {
          error: (error as Error).message,
          cache: { status: 'unknown' },
        },
      };
    }
  }
}
