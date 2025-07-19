import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from '../controllers/product.controller';
import {
  validateProductCreation,
  validateProductUpdate,
  validateGetProduct,
  validateGetProducts,
  sanitizeProductData,
  validateXSS,
} from '../validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Product CRUD routes
router.post('/', sanitizeProductData, validateXSS, validateProductCreation, createProduct);
router.get('/', validateGetProducts, getProducts);
router.get('/:id', validateGetProduct, getProduct);
router.put('/:id', sanitizeProductData, validateXSS, validateProductUpdate, updateProduct);
router.delete('/:id', validateGetProduct, deleteProduct);

export default router;
