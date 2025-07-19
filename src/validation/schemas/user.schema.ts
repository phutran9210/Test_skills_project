import { body } from 'express-validator';
import {
  PASSWORD_REQUIREMENTS,
  NAME_REQUIREMENTS,
  REGEX_PATTERNS,
  UserRole,
  VALIDATION_MESSAGES,
} from '../../constants/validation.constants';

/**
 * User registration validation schema
 */
export const userRegistrationSchema = [
  body('email')
    .isEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL.INVALID)
    .normalizeEmail()
    .toLowerCase(),

  body('password')
    .isLength({ min: PASSWORD_REQUIREMENTS.MIN_LENGTH })
    .withMessage(VALIDATION_MESSAGES.PASSWORD.MIN_LENGTH)
    .matches(REGEX_PATTERNS.PASSWORD_STRENGTH)
    .withMessage(VALIDATION_MESSAGES.PASSWORD.STRENGTH),

  body('firstName')
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_CHARACTERS),

  body('lastName')
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_CHARACTERS),

  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage(VALIDATION_MESSAGES.ROLE.INVALID),
];

/**
 * User login validation schema
 */
export const userLoginSchema = [
  body('email')
    .isEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL.INVALID)
    .normalizeEmail()
    .toLowerCase(),

  body('password')
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.PASSWORD.REQUIRED)
    .isLength({ min: 1 })
    .withMessage(VALIDATION_MESSAGES.PASSWORD.EMPTY),
];

/**
 * User update validation schema
 */
export const userUpdateSchema = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_CHARACTERS),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_CHARACTERS),

  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage(VALIDATION_MESSAGES.ROLE.INVALID),
];

/**
 * User profile update validation schema
 */
export const userProfileUpdateSchema = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.FIRST_NAME_CHARACTERS),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: NAME_REQUIREMENTS.MIN_LENGTH, max: NAME_REQUIREMENTS.MAX_LENGTH })
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME_CHARACTERS)
    .withMessage(VALIDATION_MESSAGES.NAME.LAST_NAME_CHARACTERS),
];

/**
 * Password change validation schema
 */
export const passwordChangeSchema = [
  body('currentPassword').notEmpty().withMessage(VALIDATION_MESSAGES.PASSWORD.CURRENT_REQUIRED),

  body('newPassword')
    .isLength({ min: PASSWORD_REQUIREMENTS.MIN_LENGTH })
    .withMessage(VALIDATION_MESSAGES.PASSWORD.NEW_MIN_LENGTH)
    .matches(REGEX_PATTERNS.PASSWORD_STRENGTH)
    .withMessage(VALIDATION_MESSAGES.PASSWORD.NEW_STRENGTH),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error(VALIDATION_MESSAGES.PASSWORD.CONFIRMATION_MISMATCH);
    }
    return true;
  }),
];

/**
 * User ID validation schema
 */
export const userIdSchema = [
  body('id').isUUID().withMessage(VALIDATION_MESSAGES.ID.INVALID_FORMAT),
];

/**
 * Email validation schema
 */
export const emailSchema = [
  body('email')
    .isEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL.INVALID)
    .normalizeEmail()
    .toLowerCase(),
];
