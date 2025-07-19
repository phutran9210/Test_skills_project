export interface CacheConfig {
  productTTL: number;
  productListTTL: number;
  defaultTTL: number;
}

export const cacheConfig: CacheConfig = {
  productTTL: parseInt(process.env.CACHE_PRODUCT_TTL || '60'),
  productListTTL: parseInt(process.env.CACHE_PRODUCT_LIST_TTL || '300'),
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '60'),
};

export default cacheConfig;
