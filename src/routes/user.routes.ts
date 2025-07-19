import express from 'express';
import { UserController } from '../controllers/user.controller';
import { validateUserRegistration, validateUserLogin } from '../validation';

const router = express.Router();
const userController = new UserController();

router.post('/register', validateUserRegistration, userController.register);
router.post('/login', validateUserLogin, userController.login);

export default router;
