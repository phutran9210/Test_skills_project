/**
 * Validation constants for user and product input validation
 */

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
} as const;

// Name requirements
export const NAME_REQUIREMENTS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 50,
} as const;

// Email requirements
export const EMAIL_REQUIREMENTS = {
  MAX_LENGTH: 254,
} as const;

// Product requirements
export const PRODUCT_REQUIREMENTS = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  PRICE: {
    MIN_VALUE: 0.01,
    MAX_VALUE: 999999.99,
    MAX_DECIMAL_PLACES: 2,
  },
  CATEGORY: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  SEARCH: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  BULK_OPERATIONS: {
    MIN_IDS: 1,
    MAX_IDS: 100,
  },
} as const;

// Pagination requirements
export const PAGINATION_REQUIREMENTS = {
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
  PASSWORD_STRENGTH: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  NAME_CHARACTERS: /^[a-zA-ZÀ-ỹ\s]+$/,
  UUID_FORMAT: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  PRODUCT_NAME: /^[a-zA-Z0-9\s\-_.()]+$/,
  PRODUCT_CATEGORY: /^[a-zA-Z0-9\s\-_&]+$/,
  PRODUCT_SEARCH: /^[a-zA-Z0-9\s\-_.()&]+$/,
} as const;

// User roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// Validation messages
export const VALIDATION_MESSAGES = {
  EMAIL: {
    INVALID: 'Invalid email format',
    REQUIRED: 'Email is required',
  },
  PASSWORD: {
    REQUIRED: 'Password is required',
    MIN_LENGTH: `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`,
    STRENGTH: 'Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number',
    EMPTY: 'Password cannot be empty',
    CURRENT_REQUIRED: 'Current password is required',
    NEW_MIN_LENGTH: `New password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`,
    NEW_STRENGTH:
      'New password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number',
    CONFIRMATION_MISMATCH: 'Password confirmation does not match',
  },
  NAME: {
    FIRST_NAME_LENGTH: `First name must be between ${NAME_REQUIREMENTS.MIN_LENGTH}-${NAME_REQUIREMENTS.MAX_LENGTH} characters`,
    FIRST_NAME_CHARACTERS: 'First name can only contain letters and spaces',
    LAST_NAME_LENGTH: `Last name must be between ${NAME_REQUIREMENTS.MIN_LENGTH}-${NAME_REQUIREMENTS.MAX_LENGTH} characters`,
    LAST_NAME_CHARACTERS: 'Last name can only contain letters and spaces',
  },
  ROLE: {
    INVALID: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  },
  ID: {
    INVALID_FORMAT: 'Invalid user ID format',
  },
  PRODUCT: {
    NAME: {
      REQUIRED: 'Product name is required',
      MUST_BE_STRING: 'Product name must be a string',
      LENGTH: `Product name must be between ${PRODUCT_REQUIREMENTS.NAME.MIN_LENGTH} and ${PRODUCT_REQUIREMENTS.NAME.MAX_LENGTH} characters`,
      INVALID_CHARACTERS: 'Product name contains invalid characters',
    },
    PRICE: {
      REQUIRED: 'Product price is required',
      MUST_BE_NUMBER: 'Product price must be a number',
      MUST_BE_POSITIVE: 'Product price must be a positive number',
      MAX_VALUE: `Product price cannot exceed ${PRODUCT_REQUIREMENTS.PRICE.MAX_VALUE.toLocaleString()}`,
      MAX_DECIMAL_PLACES: `Product price cannot have more than ${PRODUCT_REQUIREMENTS.PRICE.MAX_DECIMAL_PLACES} decimal places`,
    },
    CATEGORY: {
      REQUIRED: 'Product category is required',
      MUST_BE_STRING: 'Product category must be a string',
      LENGTH: `Product category must be between ${PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH} and ${PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH} characters`,
      INVALID_CHARACTERS: 'Product category contains invalid characters',
    },
    ID: {
      MUST_BE_POSITIVE_INTEGER: 'Product ID must be a positive integer',
    },
    UPDATE: {
      AT_LEAST_ONE_FIELD:
        'At least one field (name, price, or category) must be provided for update',
    },
    SEARCH: {
      REQUIRED: 'Search term is required',
      MUST_BE_STRING: 'Search term must be a string',
      LENGTH: `Search term must be between ${PRODUCT_REQUIREMENTS.SEARCH.MIN_LENGTH} and ${PRODUCT_REQUIREMENTS.SEARCH.MAX_LENGTH} characters`,
      INVALID_CHARACTERS: 'Search term contains invalid characters',
    },
    BULK_DELETE: {
      IDS_ARRAY: `IDs must be an array with ${PRODUCT_REQUIREMENTS.BULK_OPERATIONS.MIN_IDS} to ${PRODUCT_REQUIREMENTS.BULK_OPERATIONS.MAX_IDS} elements`,
      IDS_MUST_BE_ARRAY: 'IDs must be an array',
      ALL_IDS_POSITIVE: 'All IDs must be positive integers',
      NO_DUPLICATES: 'Duplicate IDs are not allowed',
    },
    CATEGORY_MANAGEMENT: {
      OLD_CATEGORY_REQUIRED: 'Old category name is required',
      OLD_CATEGORY_STRING: 'Old category name must be a string',
      OLD_CATEGORY_LENGTH: `Old category name must be between ${PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH} and ${PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH} characters`,
      NEW_CATEGORY_REQUIRED: 'New category name is required',
      NEW_CATEGORY_STRING: 'New category name must be a string',
      NEW_CATEGORY_LENGTH: `New category name must be between ${PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH} and ${PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH} characters`,
      NEW_CATEGORY_INVALID_CHARACTERS: 'New category name contains invalid characters',
    },
  },
  PAGINATION: {
    PAGE_POSITIVE: 'Page must be a positive integer',
    LIMIT_RANGE: `Limit must be between ${PAGINATION_REQUIREMENTS.MIN_LIMIT} and ${PAGINATION_REQUIREMENTS.MAX_LIMIT}`,
  },
  QUERY: {
    CATEGORY_FILTER_STRING: 'Category filter must be a string',
    CATEGORY_FILTER_LENGTH: `Category filter must be between 1 and ${PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH} characters`,
    CATEGORY_FILTER_INVALID_CHARACTERS: 'Category filter contains invalid characters',
    NAME_SEARCH_STRING: 'Name search must be a string',
    NAME_SEARCH_LENGTH: `Name search must be between 1 and ${PRODUCT_REQUIREMENTS.NAME.MAX_LENGTH} characters`,
    MIN_PRICE_NUMBER: 'Minimum price must be a number',
    MIN_PRICE_POSITIVE: 'Minimum price must be a positive number',
    MAX_PRICE_NUMBER: 'Maximum price must be a number',
    MAX_PRICE_POSITIVE: 'Maximum price must be a positive number',
    MAX_PRICE_GREATER_THAN_MIN: 'Maximum price must be greater than minimum price',
  },
} as const;
