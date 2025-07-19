/**
 * Utility helper functions
 */

/**
 * Delays execution for the specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Checks if a value is a valid positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return isValidNumber(value) && value > 0;
}

/**
 * Checks if a value is a valid positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return isPositiveNumber(value) && Number.isInteger(value);
}

/**
 * Checks if a string is empty or contains only whitespace
 */
export function isEmptyString(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

/**
 * Checks if a value is a valid email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formats a date to ISO string with timezone
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parses a string to number or returns default value
 */
export function parseNumber(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parses a string to integer or returns default value
 */
export function parseInteger(value: string, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Creates a debounced function that delays execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled function that limits execution frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deeply clones an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (obj instanceof Object) {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Removes undefined values from an object
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Converts an object to query string
 */
export function objectToQueryString(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }

  return params.toString();
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffFactor: number = 2,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delayMs = initialDelay * Math.pow(backoffFactor, attempt);
      await delay(delayMs);
    }
  }

  throw lastError!;
}
