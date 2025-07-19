/**
 * Base class for cache-related errors
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

/**
 * Error thrown when cache connection issues occur
 */
export class CacheConnectionError extends CacheError {
  constructor(message: string, originalError?: Error) {
    super(message, 'connection', originalError);
    this.name = 'CacheConnectionError';
  }
}

/**
 * Error thrown when cache operations fail
 */
export class CacheOperationError extends CacheError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, operation, originalError);
    this.name = 'CacheOperationError';
  }
}

/**
 * Error thrown when cache configuration is invalid
 */
export class CacheConfigurationError extends CacheError {
  constructor(message: string, originalError?: Error) {
    super(message, 'configuration', originalError);
    this.name = 'CacheConfigurationError';
  }
}

/**
 * Error thrown when cache data is invalid or corrupted
 */
export class CacheDataError extends CacheError {
  constructor(message: string, originalError?: Error) {
    super(message, 'data', originalError);
    this.name = 'CacheDataError';
  }
}

/**
 * Error thrown when cache timeout occurs
 */
export class CacheTimeoutError extends CacheError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, operation, originalError);
    this.name = 'CacheTimeoutError';
  }
}
