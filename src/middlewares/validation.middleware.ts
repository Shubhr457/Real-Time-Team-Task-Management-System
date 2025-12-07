import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../responses/api-response';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys from the validated data
    });

    if (error) {
      const errorMessages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      ApiResponse.badRequest(res, 'Validation failed', { errors: errorMessages });
      return;
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};

