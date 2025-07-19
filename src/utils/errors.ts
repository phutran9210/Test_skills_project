/**
 * Base application error class
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly code?: string;

  constructor(message: string, field?: string, code?: string, statusCode: number = 400) {
    super(message, statusCode);
    this.field = field;
    this.code = code;
    this.name = 'ValidationError';
  }
}

/**
 * Error for not found resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error for forbidden access
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error for conflicts (e.g., duplicate resources)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Error for business logic violations
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, statusCode: number = 422) {
    super(message, statusCode);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Error for database operations
 */
export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly originalError?: Error;

  constructor(message: string, operation: string, originalError?: Error, statusCode: number = 500) {
    super(message, statusCode);
    this.operation = operation;
    this.originalError = originalError;
    this.name = 'DatabaseError';
  }
}

/**
 * Error for external service failures
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(message: string, service: string, originalError?: Error, statusCode: number = 503) {
    super(message, statusCode);
    this.service = service;
    this.originalError = originalError;
    this.name = 'ExternalServiceError';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

/**
 * Utility function to create error response object
 */
export function createErrorResponse(error: AppError | Error): {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode?: number;
    field?: string;
    code?: string;
    operation?: string;
  };
} {
  const baseError = {
    name: error.name,
    message: error.message,
  };

  if (isAppError(error)) {
    return {
      success: false,
      error: {
        ...baseError,
        statusCode: error.statusCode,
        ...(error instanceof ValidationError && {
          field: error.field,
          code: error.code,
        }),
        ...(error instanceof DatabaseError && {
          operation: error.operation,
        }),
        ...(error instanceof ExternalServiceError && {
          service: error.service,
        }),
      },
    };
  }

  return {
    success: false,
    error: {
      ...baseError,
      statusCode: 500,
    },
  };
}
