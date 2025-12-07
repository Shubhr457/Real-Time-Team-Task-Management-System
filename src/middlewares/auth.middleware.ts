import { Response, NextFunction } from 'express';
import { JwtHelper } from '../helpers/jwt.helper';
import { ResponseHandler } from '../responses';
import { ResponseMessages } from '../response-messages';
import { AuthRequest } from '../interfaces';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHandler.unauthorized(res, ResponseMessages.AUTH.TOKEN_MISSING);
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    try {
      const decoded = JwtHelper.verifyToken(token);

      // Attach user info to request object
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };

      next();
    } catch (error) {
      ResponseHandler.unauthorized(res, ResponseMessages.AUTH.TOKEN_INVALID);
      return;
    }
  } catch (error: any) {
    ResponseHandler.serverError(
      res,
      ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
      error
    );
    return;
  }
};

