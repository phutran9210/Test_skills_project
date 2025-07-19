import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ProductValidationSchema } from './schemas/product.schema';
import { ValidationError, createErrorResponse } from '../utils';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const validationError = new ValidationError(
      firstError.msg,
      'param' in firstError ? String(firstError.param) : undefined,
      'VALIDATION_ERROR',
    );

    const errorResponse = createErrorResponse(validationError);
    res.status(400).json({
      ...errorResponse,
      details: errors.array(), // Include all validation errors for debugging
    });
    return;
  }

  next();
};

/**
 * Validation middleware for product creation
 */
export const validateProductCreation = [
  ...ProductValidationSchema.getCreateRules(),
  handleValidationErrors,
];

/**
 * Validation middleware for product update
 */
export const validateProductUpdate = [
  ...ProductValidationSchema.getUpdateRules(),
  handleValidationErrors,
];

/**
 * Validation middleware for product ID parameter
 */
export const validateProductId = [...ProductValidationSchema.getIdRules(), handleValidationErrors];

/**
 * Validation middleware for product query parameters
 */
export const validateProductQuery = [
  ...ProductValidationSchema.getQueryRules(),
  handleValidationErrors,
];

/**
 * Validation middleware for product search
 */
export const validateProductSearch = [
  ...ProductValidationSchema.getSearchRules(),
  handleValidationErrors,
];

/**
 * Validation middleware for bulk delete
 */
export const validateBulkDelete = [
  ...ProductValidationSchema.getBulkDeleteRules(),
  handleValidationErrors,
];

/**
 * Validation middleware for category management
 */
export const validateCategoryUpdate = [
  ...ProductValidationSchema.getCategoryRules(),
  handleValidationErrors,
];

/**
 * Combined validation middleware for getting a single product
 */
export const validateGetProduct = [...ProductValidationSchema.getIdRules(), handleValidationErrors];

/**
 * Combined validation middleware for getting products with query
 */
export const validateGetProducts = [
  ...ProductValidationSchema.getQueryRules(),
  handleValidationErrors,
];

/**
 * Custom validation middleware for price range consistency
 */
export const validatePriceRange = (req: Request, res: Response, next: NextFunction): void => {
  const { minPrice, maxPrice } = req.query;

  if (minPrice && maxPrice) {
    const min = parseFloat(minPrice as string);
    const max = parseFloat(maxPrice as string);

    if (min >= max) {
      const validationError = new ValidationError(
        'Maximum price must be greater than minimum price',
        'maxPrice',
        'INVALID_RANGE',
      );

      const errorResponse = createErrorResponse(validationError);
      res.status(400).json(errorResponse);
      return;
    }
  }

  next();
};

/**
 * Sanitization middleware for product data
 */
export const sanitizeProductData = (req: Request, res: Response, next: NextFunction): void => {
  const { body } = req;

  // Sanitize product name
  if (body.name) {
    body.name = body.name.trim();
  }

  // Sanitize and normalize category
  if (body.category) {
    body.category = body.category.trim();
  }

  // Ensure price is properly formatted
  if (body.price) {
    body.price = parseFloat(body.price);
  }

  next();
};

/**
 * Validation middleware that checks for XSS attempts
 */
export const validateXSS = (req: Request, res: Response, next: NextFunction): void => {
  const checkForXSS = (value: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src\s*=\s*["']javascript:/gi,
    ];

    return xssPatterns.some((pattern) => pattern.test(value));
  };

  const validateObject = (obj: unknown): boolean => {
    if (typeof obj !== 'object' || obj === null) {
      return true;
    }

    const record = obj as Record<string, unknown>;
    for (const key in record) {
      if (typeof record[key] === 'string' && checkForXSS(record[key] as string)) {
        return false;
      }
      if (typeof record[key] === 'object' && record[key] !== null) {
        if (!validateObject(record[key])) {
          return false;
        }
      }
    }
    return true;
  };

  // Check request body
  if (req.body && !validateObject(req.body)) {
    const validationError = new ValidationError(
      'Invalid input detected. Potential XSS attempt.',
      'body',
      'XSS_DETECTED',
    );

    const errorResponse = createErrorResponse(validationError);
    res.status(400).json(errorResponse);
    return;
  }

  // Check query parameters
  if (req.query && !validateObject(req.query)) {
    const validationError = new ValidationError(
      'Invalid query parameters detected. Potential XSS attempt.',
      'query',
      'XSS_DETECTED',
    );

    const errorResponse = createErrorResponse(validationError);
    res.status(400).json(errorResponse);
    return;
  }

  next();
};
