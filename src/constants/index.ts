import cacheConfig from '../config/cache.config';
import productConfig from '../config/product.config';

export const DATABASE_CONFIG = {
  DEFAULT_HOST: 'localhost',
  DEFAULT_PORT: 5432,
  DEFAULT_USER: 'test',
  DEFAULT_PASSWORD: 'test',
  DEFAULT_NAME: 'smartcos',
} as const;

export const REDIS_CONFIG = {
  DEFAULT_HOST: 'localhost',
  DEFAULT_PORT: 6379,
} as const;

export const AUTH_CONFIG = {
  DEFAULT_JWT_SECRET: 'secret',
} as const;

export const CACHE_CONFIG = {
  PRODUCTS_TTL: cacheConfig.productTTL,
  PRODUCTS_KEY_PREFIX: 'products',
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: productConfig.defaultPage,
  DEFAULT_LIMIT: productConfig.defaultLimit,
  MAX_LIMIT: productConfig.maxLimit,
} as const;
