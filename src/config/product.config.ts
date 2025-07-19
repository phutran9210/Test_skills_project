export interface ProductConfig {
  defaultPage: number;
  defaultLimit: number;
  maxLimit: number;
  searchMinLength: number;
  asyncCacheEnabled: boolean;
  enableCacheInvalidation: boolean;
  enableProductListInvalidation: boolean;
  enableEventEmission: boolean;
}

export const productConfig: ProductConfig = {
  defaultPage: parseInt(process.env.PRODUCT_DEFAULT_PAGE || '1'),
  defaultLimit: parseInt(process.env.PRODUCT_DEFAULT_LIMIT || '10'),
  maxLimit: parseInt(process.env.PRODUCT_MAX_LIMIT || '100'),
  searchMinLength: parseInt(process.env.PRODUCT_SEARCH_MIN_LENGTH || '3'),
  asyncCacheEnabled: process.env.PRODUCT_ASYNC_CACHE_ENABLED !== 'false',
  enableCacheInvalidation: process.env.PRODUCT_ENABLE_CACHE_INVALIDATION !== 'false',
  enableProductListInvalidation: process.env.PRODUCT_ENABLE_LIST_INVALIDATION !== 'false',
  enableEventEmission: process.env.PRODUCT_ENABLE_EVENT_EMISSION === 'true',
};

export default productConfig;
