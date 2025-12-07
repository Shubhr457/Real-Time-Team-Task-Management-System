import jwt from 'jsonwebtoken';
import { config } from '../environments';
import { JwtPayload } from '../interfaces';

export class JwtHelper {
  /**
   * Generate JWT access token
   */
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });
  }

  /**
   * Verify JWT access token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    } catch (error: any) {
      // Preserve the original error for better error handling
      if (error.name === 'TokenExpiredError') {
        const expiredError: any = new Error('Refresh token has expired');
        expiredError.name = 'TokenExpiredError';
        throw expiredError;
      }
      if (error.name === 'JsonWebTokenError') {
        const invalidError: any = new Error('Invalid refresh token');
        invalidError.name = 'JsonWebTokenError';
        throw invalidError;
      }
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode JWT token without verification
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }
}
