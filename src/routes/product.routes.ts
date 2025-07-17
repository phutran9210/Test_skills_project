import { Router } from 'express';
import { getProducts, createProduct } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.post('/', createProduct);
router.get('/', getProducts);

export default router;
