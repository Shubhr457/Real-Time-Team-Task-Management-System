import { Socket } from 'socket.io';
import { JwtHelper } from '../helpers/jwt.helper';
import { AuthenticatedSocket } from '../interfaces/socket.interface';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from handshake auth or query
 */
export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    // Get token from auth object or query params
    const token = 
      (socket.handshake.auth?.token as string) || 
      (socket.handshake.query?.token as string);

    if (!token) {
      console.log('❌ Socket connection rejected: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    try {
      const decoded = JwtHelper.verifyToken(token);
      
      // Attach user info to socket
      (socket as AuthenticatedSocket).user = {
        userId: decoded.userId,
        email: decoded.email,
      };

      console.log(`✅ Socket authenticated: User ${decoded.userId} (${decoded.email})`);
      next();
    } catch (error) {
      console.log('❌ Socket connection rejected: Invalid token');
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  } catch (error: any) {
    console.error('❌ Socket authentication error:', error);
    return next(new Error('Authentication error: ' + error.message));
  }
};
