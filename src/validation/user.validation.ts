import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { userRegistrationSchema, userLoginSchema } from './schemas/user.schema';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Invalid data',
      errors: errors.array().map((error) => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined,
      })),
    });
    return;
  }

  next();
};

/**
 * Validation rules for user registration
 */
export const validateUserRegistration = [...userRegistrationSchema, handleValidationErrors];

/**
 * Validation rules for user login
 */
export const validateUserLogin = [...userLoginSchema, handleValidationErrors];
