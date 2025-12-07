import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../responses';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
    return ResponseHandler.validationError(
      res,
      'Validation failed',
      errors
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ResponseHandler.error(
      res,
      `${field} already exists`,
      'Duplicate field value',
      409
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return ResponseHandler.error(
      res,
      'Invalid ID format',
      'Cast error',
      400
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseHandler.unauthorized(res, 'Token has expired');
  }

  // Default error
  return ResponseHandler.serverError(
    res,
    err.message || 'Internal server error',
    err
  );
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return ResponseHandler.notFound(
    res,
    `Route ${req.originalUrl} not found`
  );
};
