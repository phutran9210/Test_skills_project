import { body, param, query, ValidationChain } from 'express-validator';
import { isPositiveNumber, isPositiveInteger } from '../../utils';
import {
  PRODUCT_REQUIREMENTS,
  PAGINATION_REQUIREMENTS,
  REGEX_PATTERNS,
  VALIDATION_MESSAGES,
} from '../../constants/validation.constants';

/**
 * Product validation schemas with comprehensive rules
 */
export class ProductValidationSchema {
  /**
   * Validation rules for product creation
   */
  static getCreateRules(): ValidationChain[] {
    return [
      // Name validation
      body('name')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.REQUIRED)
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.MUST_BE_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.NAME.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.NAME.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_NAME)
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.INVALID_CHARACTERS),

      // Price validation
      body('price')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.PRICE.REQUIRED)
        .isNumeric()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.PRICE.MUST_BE_NUMBER)
        .custom((value) => {
          const price = parseFloat(value);
          if (!isPositiveNumber(price)) {
            throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MUST_BE_POSITIVE);
          }
          if (price > PRODUCT_REQUIREMENTS.PRICE.MAX_VALUE) {
            throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MAX_VALUE);
          }
          // Check for reasonable decimal places
          if (price.toString().includes('.')) {
            const decimals = price.toString().split('.')[1];
            if (decimals && decimals.length > PRODUCT_REQUIREMENTS.PRICE.MAX_DECIMAL_PLACES) {
              throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MAX_DECIMAL_PLACES);
            }
          }
          return true;
        }),

      // Category validation
      body('category')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.REQUIRED)
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.MUST_BE_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_CATEGORY)
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.INVALID_CHARACTERS)
        .customSanitizer((value) => {
          // Normalize category (capitalize first letter of each word)
          return value
            .toLowerCase()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }),
    ];
  }

  /**
   * Validation rules for product update
   */
  static getUpdateRules(): ValidationChain[] {
    return [
      // ID validation (from params)
      param('id')
        .isInt({ min: PAGINATION_REQUIREMENTS.MIN_PAGE })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.ID.MUST_BE_POSITIVE_INTEGER),

      // Name validation (optional)
      body('name')
        .optional()
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.MUST_BE_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.NAME.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.NAME.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_NAME)
        .withMessage(VALIDATION_MESSAGES.PRODUCT.NAME.INVALID_CHARACTERS),

      // Price validation (optional)
      body('price')
        .optional()
        .isNumeric()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.PRICE.MUST_BE_NUMBER)
        .custom((value) => {
          if (value !== undefined && value !== null) {
            const price = parseFloat(value);
            if (!isPositiveNumber(price)) {
              throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MUST_BE_POSITIVE);
            }
            if (price > PRODUCT_REQUIREMENTS.PRICE.MAX_VALUE) {
              throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MAX_VALUE);
            }
            if (price.toString().includes('.')) {
              const decimals = price.toString().split('.')[1];
              if (decimals && decimals.length > PRODUCT_REQUIREMENTS.PRICE.MAX_DECIMAL_PLACES) {
                throw new Error(VALIDATION_MESSAGES.PRODUCT.PRICE.MAX_DECIMAL_PLACES);
              }
            }
          }
          return true;
        }),

      // Category validation (optional)
      body('category')
        .optional()
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.MUST_BE_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_CATEGORY)
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY.INVALID_CHARACTERS)
        .customSanitizer((value) => {
          if (value) {
            return value
              .toLowerCase()
              .split(' ')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
          return value;
        }),

      // Ensure at least one field is provided
      body().custom((value, { req }) => {
        const { name, price, category } = req.body;
        if (!name && !price && !category) {
          throw new Error(VALIDATION_MESSAGES.PRODUCT.UPDATE.AT_LEAST_ONE_FIELD);
        }
        return true;
      }),
    ];
  }

  /**
   * Validation rules for product ID parameter
   */
  static getIdRules(): ValidationChain[] {
    return [
      param('id')
        .isInt({ min: PAGINATION_REQUIREMENTS.MIN_PAGE })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.ID.MUST_BE_POSITIVE_INTEGER)
        .custom((value) => {
          const id = parseInt(value);
          if (!isPositiveInteger(id)) {
            throw new Error(VALIDATION_MESSAGES.PRODUCT.ID.MUST_BE_POSITIVE_INTEGER);
          }
          return true;
        }),
    ];
  }

  /**
   * Validation rules for product query parameters
   */
  static getQueryRules(): ValidationChain[] {
    return [
      // Page validation
      query('page')
        .optional()
        .isInt({ min: PAGINATION_REQUIREMENTS.MIN_PAGE })
        .withMessage(VALIDATION_MESSAGES.PAGINATION.PAGE_POSITIVE),

      // Limit validation
      query('limit')
        .optional()
        .isInt({
          min: PAGINATION_REQUIREMENTS.MIN_LIMIT,
          max: PAGINATION_REQUIREMENTS.MAX_LIMIT,
        })
        .withMessage(VALIDATION_MESSAGES.PAGINATION.LIMIT_RANGE),

      // Category filter validation
      query('category')
        .optional()
        .isString()
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_STRING)
        .trim()
        .isLength({
          min: PAGINATION_REQUIREMENTS.MIN_PAGE,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_CATEGORY)
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_INVALID_CHARACTERS),

      // Name search validation
      query('name')
        .optional()
        .isString()
        .withMessage(VALIDATION_MESSAGES.QUERY.NAME_SEARCH_STRING)
        .trim()
        .isLength({
          min: PAGINATION_REQUIREMENTS.MIN_PAGE,
          max: PRODUCT_REQUIREMENTS.NAME.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.QUERY.NAME_SEARCH_LENGTH),

      // Price range validation
      query('minPrice')
        .optional()
        .isNumeric()
        .withMessage(VALIDATION_MESSAGES.QUERY.MIN_PRICE_NUMBER)
        .custom((value) => {
          const price = parseFloat(value);
          if (!isPositiveNumber(price)) {
            throw new Error(VALIDATION_MESSAGES.QUERY.MIN_PRICE_POSITIVE);
          }
          return true;
        }),

      query('maxPrice')
        .optional()
        .isNumeric()
        .withMessage(VALIDATION_MESSAGES.QUERY.MAX_PRICE_NUMBER)
        .custom((value, { req }) => {
          const price = parseFloat(value);
          if (!isPositiveNumber(price)) {
            throw new Error(VALIDATION_MESSAGES.QUERY.MAX_PRICE_POSITIVE);
          }

          // Check if minPrice is also provided and maxPrice > minPrice
          const minPrice = req.query?.minPrice;
          if (minPrice && parseFloat(minPrice as string) >= price) {
            throw new Error(VALIDATION_MESSAGES.QUERY.MAX_PRICE_GREATER_THAN_MIN);
          }

          return true;
        }),
    ];
  }

  /**
   * Validation rules for product search
   */
  static getSearchRules(): ValidationChain[] {
    return [
      // Search term validation
      query('q')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.SEARCH.REQUIRED)
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.SEARCH.MUST_BE_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.SEARCH.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.SEARCH.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.SEARCH.LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_SEARCH)
        .withMessage(VALIDATION_MESSAGES.PRODUCT.SEARCH.INVALID_CHARACTERS),

      // Include common query rules (excluding name since we use 'q' for search)
      query('page')
        .optional()
        .isInt({ min: PAGINATION_REQUIREMENTS.MIN_PAGE })
        .withMessage(VALIDATION_MESSAGES.PAGINATION.PAGE_POSITIVE),

      query('limit')
        .optional()
        .isInt({
          min: PAGINATION_REQUIREMENTS.MIN_LIMIT,
          max: PAGINATION_REQUIREMENTS.MAX_LIMIT,
        })
        .withMessage(VALIDATION_MESSAGES.PAGINATION.LIMIT_RANGE),

      query('category')
        .optional()
        .isString()
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_STRING)
        .trim()
        .isLength({
          min: PAGINATION_REQUIREMENTS.MIN_PAGE,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_CATEGORY)
        .withMessage(VALIDATION_MESSAGES.QUERY.CATEGORY_FILTER_INVALID_CHARACTERS),
    ];
  }

  /**
   * Validation rules for bulk operations
   */
  static getBulkDeleteRules(): ValidationChain[] {
    return [
      body('ids')
        .isArray({
          min: PRODUCT_REQUIREMENTS.BULK_OPERATIONS.MIN_IDS,
          max: PRODUCT_REQUIREMENTS.BULK_OPERATIONS.MAX_IDS,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.BULK_DELETE.IDS_ARRAY)
        .custom((ids) => {
          if (!Array.isArray(ids)) {
            throw new Error(VALIDATION_MESSAGES.PRODUCT.BULK_DELETE.IDS_MUST_BE_ARRAY);
          }

          // Check if all IDs are positive integers
          for (const id of ids) {
            if (!isPositiveInteger(parseInt(id))) {
              throw new Error(VALIDATION_MESSAGES.PRODUCT.BULK_DELETE.ALL_IDS_POSITIVE);
            }
          }

          // Check for duplicates
          const uniqueIds = new Set(ids);
          if (uniqueIds.size !== ids.length) {
            throw new Error(VALIDATION_MESSAGES.PRODUCT.BULK_DELETE.NO_DUPLICATES);
          }

          return true;
        }),
    ];
  }

  /**
   * Validation rules for category management
   */
  static getCategoryRules(): ValidationChain[] {
    return [
      body('oldCategory')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.OLD_CATEGORY_REQUIRED)
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.OLD_CATEGORY_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.OLD_CATEGORY_LENGTH),

      body('newCategory')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.NEW_CATEGORY_REQUIRED)
        .isString()
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.NEW_CATEGORY_STRING)
        .trim()
        .isLength({
          min: PRODUCT_REQUIREMENTS.CATEGORY.MIN_LENGTH,
          max: PRODUCT_REQUIREMENTS.CATEGORY.MAX_LENGTH,
        })
        .withMessage(VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.NEW_CATEGORY_LENGTH)
        .matches(REGEX_PATTERNS.PRODUCT_CATEGORY)
        .withMessage(
          VALIDATION_MESSAGES.PRODUCT.CATEGORY_MANAGEMENT.NEW_CATEGORY_INVALID_CHARACTERS,
        )
        .customSanitizer((value) => {
          return value
            .toLowerCase()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }),
    ];
  }
}
