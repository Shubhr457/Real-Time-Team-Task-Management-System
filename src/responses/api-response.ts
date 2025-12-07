import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  statusCode: number;
}

export class ApiResponse {
  /**
   * Send success response
   */
  public static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponseData<T> = {
      success: true,
      message,
      data,
      statusCode,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  public static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: any
  ): Response {
    const response: ApiResponseData = {
      success: false,
      message,
      statusCode,
      ...(error && { error }),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  public static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  public static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send bad request response (400)
   */
  public static badRequest(
    res: Response,
    message: string = 'Bad request',
    error?: any
  ): Response {
    return this.error(res, message, 400, error);
  }

  /**
   * Send unauthorized response (401)
   */
  public static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response (403)
   */
  public static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return this.error(res, message, 403);
  }

  /**
   * Send not found response (404)
   */
  public static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, 404);
  }

  /**
   * Send conflict response (409)
   */
  public static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, 409);
  }

  /**
   * Send internal server error (500)
   */
  public static internalError(
    res: Response,
    message: string = 'Internal server error',
    error?: any
  ): Response {
    return this.error(res, message, 500, error);
  }
}

