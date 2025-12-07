import { Request, Response } from 'express';
import User from '../../../../models/user.model';
import { ResponseHandler } from '../../../../responses';
import { ResponseMessages } from '../../../../response-messages';
import { JwtHelper } from '../../../../helpers/jwt.helper';
import { AuthRequest, LoginResponse, RefreshTokenResponse } from '../../../../interfaces';
import { RegisterDto, LoginDto, VerifyOTPDto, ResendOTPDto, RefreshTokenDto } from '../dtos';
import { sendOTPEmail, sendPasswordEmail } from '../../../../services/email.service';
import { generateOTP, generateOTPExpiry, isOTPExpired, generateSecurePassword, hashOTP } from '../../../../helpers/otp.helper';

export class AuthController {
  /**
   * Register a new user (Step 1: Send OTP)
   */
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email }: RegisterDto = req.body;

      // Check if user already exists and is verified
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isVerified) {
        return ResponseHandler.error(
          res,
          ResponseMessages.AUTH.EMAIL_ALREADY_EXISTS,
          'Email already exists',
          409
        );
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = generateOTPExpiry();
      const hashedOTP = hashOTP(otp);

      if (existingUser && !existingUser.isVerified) {
        // Update existing unverified user with new OTP
        existingUser.name = name;
        existingUser.otp = hashedOTP;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
      } else {
        // Create new user (without password, unverified)
        const user = new User({
          name,
          email,
          isVerified: false,
          otp: hashedOTP,
          otpExpiry,
        });

        await user.save();
      }

      // Send OTP email (non-blocking)
      sendOTPEmail(email, name, otp)
        .then(() => console.log('OTP email sent successfully'))
        .catch((err) => console.error('Failed to send OTP email:', err));

      return ResponseHandler.success(
        res,
        'OTP sent to your email. Please verify to complete registration.',
        {
          email,
          message: 'Please check your email for the OTP code. It will expire in 10 minutes.',
        },
        201
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Resend OTP for email verification
   */
  static async resendOTP(req: Request, res: Response): Promise<Response> {
    try {
      const { email }: ResendOTPDto = req.body;

      // Find user by email
      const user = await User.findOne({ email }).select('+otp +otpExpiry');
      
      if (!user) {
        return ResponseHandler.error(
          res,
          'User not found. Please register first.',
          'User not found',
          404
        );
      }

      // Check if user is already verified
      if (user.isVerified) {
        return ResponseHandler.error(
          res,
          'User already verified. Please login.',
          'Already verified',
          400
        );
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = generateOTPExpiry();
      const hashedOTP = hashOTP(otp);

      // Update user with new OTP
      user.otp = hashedOTP;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email (non-blocking)
      sendOTPEmail(email, user.name, otp)
        .then(() => console.log('OTP email sent successfully'))
        .catch((err) => console.error('Failed to send OTP email:', err));

      return ResponseHandler.success(
        res,
        'OTP resent to your email. Please verify to complete registration.',
        {
          email,
          message: 'Please check your email for the new OTP code. It will expire in 10 minutes.',
        },
        200
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Verify OTP (Step 2: Verify and activate account)
   */
  static async verifyOTP(req: Request, res: Response): Promise<Response> {
    try {
      const { email, otp }: VerifyOTPDto = req.body;

      // Find user with OTP fields
      const user = await User.findOne({ email }).select('+otp +otpExpiry +password');
      
      if (!user) {
        return ResponseHandler.error(
          res,
          'User not found. Please register first.',
          'User not found',
          404
        );
      }

      if (user.isVerified) {
        return ResponseHandler.error(
          res,
          'User already verified. Please login.',
          'Already verified',
          400
        );
      }

      if (!user.otp || !user.otpExpiry) {
        return ResponseHandler.error(
          res,
          'No OTP found. Please register again.',
          'OTP not found',
          400
        );
      }

      // Check if OTP is expired
      if (isOTPExpired(user.otpExpiry)) {
        return ResponseHandler.error(
          res,
          'OTP has expired. Please register again.',
          'OTP expired',
          400
        );
      }

      // Verify OTP
      const hashedOTP = hashOTP(otp);
      if (user.otp !== hashedOTP) {
        return ResponseHandler.error(
          res,
          'Invalid OTP. Please try again.',
          'Invalid OTP',
          400
        );
      }

      // Generate secure password
      const autoGeneratedPassword = generateSecurePassword();

      // Update user - set as verified, clear OTP, set password
      user.isVerified = true;
      user.password = autoGeneratedPassword; // Will be hashed by pre-save hook
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      // Send password email (non-blocking)
      sendPasswordEmail(user.email, user.name, autoGeneratedPassword)
        .then(() => console.log('Password email sent successfully'))
        .catch((err) => console.error('Failed to send password email:', err));

      return ResponseHandler.success(
        res,
        'Email verified successfully! Your password has been sent to your email.',
        {
          email: user.email,
          message: 'Please check your email for your auto-generated password. You can now login.',
        },
        200
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password }: LoginDto = req.body;

      // Find user by email and include password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return ResponseHandler.unauthorized(
          res,
          ResponseMessages.AUTH.INVALID_CREDENTIALS
        );
      }

      // Check if user is verified
      if (!user.isVerified) {
        return ResponseHandler.error(
          res,
          'Email not verified. Please verify your email first.',
          'Email not verified',
          403
        );
      }

      // Check if password exists
      if (!user.password) {
        return ResponseHandler.error(
          res,
          'Account setup incomplete. Please complete registration.',
          'Password not set',
          400
        );
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return ResponseHandler.unauthorized(
          res,
          ResponseMessages.AUTH.INVALID_CREDENTIALS
        );
      }

      // Generate JWT access token
      const token = JwtHelper.generateToken({
        userId: (user as any)._id.toString(),
        email: user.email,
      });

      // Generate JWT refresh token
      const refreshToken = JwtHelper.generateRefreshToken({
        userId: (user as any)._id.toString(),
        email: user.email,
      });

      const responseData: LoginResponse = {
        user: {
          id: (user as any)._id.toString(),
          name: user.name,
          email: user.email,
        },
        token,
        refreshToken,
      };

      return ResponseHandler.success(
        res,
        ResponseMessages.AUTH.LOGIN_SUCCESS,
        responseData
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Logout user (client-side token removal)
   * Note: Since JWT is stateless, logout is primarily handled on the client side
   * by removing the token. This endpoint exists for consistency and can be used
   * for logging purposes or if implementing token blacklisting in the future.
   */
  static async logout(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Optional: Add logic here for token blacklisting or logging
      // For now, we just return success response
      
      return ResponseHandler.success(
        res,
        ResponseMessages.AUTH.LOGOUT_SUCCESS,
        null
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      const user = await User.findById(userId);
      if (!user) {
        return ResponseHandler.notFound(
          res,
          ResponseMessages.AUTH.USER_NOT_FOUND
        );
      }

      const userData = {
        id: (user as any)._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return ResponseHandler.success(
        res,
        ResponseMessages.USER.FETCHED,
        userData
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken }: RefreshTokenDto = req.body;

      if (!refreshToken) {
        return ResponseHandler.error(
          res,
          ResponseMessages.AUTH.REFRESH_TOKEN_MISSING,
          'Refresh token required',
          400
        );
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = JwtHelper.verifyRefreshToken(refreshToken);
      } catch (error: any) {
        // Check if token is expired
        if (error.name === 'TokenExpiredError' || error.message.includes('expired')) {
          return ResponseHandler.unauthorized(
            res,
            ResponseMessages.AUTH.REFRESH_TOKEN_EXPIRED
          );
        }
        // Check if token is invalid
        if (error.name === 'JsonWebTokenError' || error.message.includes('Invalid')) {
          return ResponseHandler.unauthorized(
            res,
            ResponseMessages.AUTH.REFRESH_TOKEN_INVALID
          );
        }
        // Generic error
        return ResponseHandler.unauthorized(
          res,
          ResponseMessages.AUTH.REFRESH_TOKEN_INVALID
        );
      }

      // Verify user still exists and is verified
      const user = await User.findById(decoded.userId);
      if (!user) {
        return ResponseHandler.notFound(
          res,
          ResponseMessages.AUTH.USER_NOT_FOUND
        );
      }

      if (!user.isVerified) {
        return ResponseHandler.error(
          res,
          ResponseMessages.AUTH.EMAIL_NOT_VERIFIED,
          'Email not verified',
          403
        );
      }

      // Generate new access token
      const newAccessToken = JwtHelper.generateToken({
        userId: (user as any)._id.toString(),
        email: user.email,
      });

      // Generate new refresh token (token rotation)
      const newRefreshToken = JwtHelper.generateRefreshToken({
        userId: (user as any)._id.toString(),
        email: user.email,
      });

      const responseData: RefreshTokenResponse = {
        token: newAccessToken,
        refreshToken: newRefreshToken,
      };

      return ResponseHandler.success(
        res,
        ResponseMessages.AUTH.REFRESH_TOKEN_SUCCESS,
        responseData
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
}
