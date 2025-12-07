import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export class ResponseHandler {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    error?: string,
    statusCode: number = 400,
    errors?: any[]
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    message: string,
    errors: any[]
  ): Response {
    return this.error(res, message, 'Validation failed', 422, errors);
  }

  static unauthorized(res: Response, message: string): Response {
    return this.error(res, message, 'Unauthorized', 401);
  }

  static notFound(res: Response, message: string): Response {
    return this.error(res, message, 'Not found', 404);
  }

  static forbidden(res: Response, message: string): Response {
    return this.error(res, message, 'Forbidden', 403);
  }

  static serverError(res: Response, message: string, error?: any): Response {
    console.error('Server Error:', error);
    return this.error(
      res,
      message,
      process.env.NODE_ENV === 'development' ? error?.message : 'Internal server error',
      500
    );
  }
}

