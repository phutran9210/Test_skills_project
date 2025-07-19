// Product validation exports
export * from './product.validation';
export * from './schemas/product.schema';

// User validation exports
export * from './user.validation';
export * from './schemas/user.schema';

// Re-export commonly used validation middleware
export {
  validateProductCreation,
  validateProductUpdate,
  validateProductId,
  validateProductQuery,
  validateProductSearch,
  validateBulkDelete,
  validateCategoryUpdate,
  validateGetProduct,
  validateGetProducts,
  validatePriceRange,
  sanitizeProductData,
  validateXSS,
  handleValidationErrors,
} from './product.validation';

// Re-export user validation middleware
export {
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors as handleUserValidationErrors,
} from './user.validation';

// Re-export constants
export * from '../constants/validation.constants';

// Re-export schema classes
export { ProductValidationSchema } from './schemas/product.schema';
export {
  userRegistrationSchema,
  userLoginSchema,
  userUpdateSchema,
  userProfileUpdateSchema,
  passwordChangeSchema,
  userIdSchema,
  emailSchema,
} from './schemas/user.schema';
