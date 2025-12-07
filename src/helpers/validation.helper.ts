import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ResponseHandler } from '../responses';
import { ResponseMessages } from '../response-messages';

/**
 * Middleware to validate request body against a class-validator DTO class
 */
export const validateRequest = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔍 VALIDATION - Original body:', req.body);
    
    // Transform plain object to class instance
    const dtoInstance = plainToInstance(dtoClass, req.body, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });

    console.log('🔍 VALIDATION - Transformed instance:', dtoInstance);

    // Validate the instance
    const errors: ValidationError[] = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
    });

    console.log('🔍 VALIDATION - Validation errors:', errors);

    if (errors.length > 0) {
      // Format errors to match the previous Joi error format
      const formattedErrors = errors.flatMap((error) => {
        const constraints = error.constraints || {};
        return Object.values(constraints).map((message) => ({
          field: error.property,
          message,
        }));
      });

      ResponseHandler.validationError(
        res,
        ResponseMessages.GENERAL.VALIDATION_ERROR,
        formattedErrors
      );
      return;
    }

    // Convert instance to plain object preserving all transformations
    const plainObject = JSON.parse(JSON.stringify(dtoInstance));
    
    // Remove undefined/null values and keep only defined properties
    const cleanedBody: any = {};
    for (const [key, value] of Object.entries(plainObject)) {
      if (value !== undefined && value !== null) {
        cleanedBody[key] = value;
      } else if (key in req.body && (req.body[key] === null || req.body[key] === '')) {
        // Preserve explicit null/empty values from original request
        cleanedBody[key] = req.body[key];
      }
    }

    req.body = cleanedBody;
    console.log('🔍 VALIDATION - Final body:', req.body);
    next();
  };
};

