import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../environments';
import { socketAuthMiddleware } from '../middlewares/socket-auth.middleware';
import { AuthenticatedSocket, SocketEvents } from '../interfaces/socket.interface';
import Team from '../models/team.model';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on(SocketEvents.CONNECTION, async (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    const userEmail = socket.user?.email;

    console.log(`🔌 Client connected: ${socket.id} | User: ${userId} (${userEmail})`);

    // Join user to their personal room
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    }

    // Handle team room joining
    socket.on(SocketEvents.JOIN_TEAM, async (data: { teamId: string }) => {
      try {
        const { teamId } = data;
        
        if (!teamId || !userId) {
          socket.emit(SocketEvents.ERROR, { message: 'Invalid team ID or user not authenticated' });
          return;
        }

        // Verify user is a member of the team
        const team = await Team.findById(teamId);
        if (!team) {
          socket.emit(SocketEvents.ERROR, { message: 'Team not found' });
          return;
        }

        if (!team.isMember(userId)) {
          socket.emit(SocketEvents.ERROR, { message: 'You are not a member of this team' });
          return;
        }

        // Join team room
        socket.join(`team:${teamId}`);
        console.log(`🏢 User ${userId} joined team room: ${teamId}`);
        
        socket.emit('team:joined', { 
          teamId, 
          teamName: team.name,
          message: 'Successfully joined team room' 
        });
      } catch (error: any) {
        console.error('Error joining team room:', error);
        socket.emit(SocketEvents.ERROR, { message: 'Failed to join team room' });
      }
    });

    // Handle team room leaving
    socket.on(SocketEvents.LEAVE_TEAM, (data: { teamId: string }) => {
      try {
        const { teamId } = data;
        
        if (!teamId) {
          socket.emit(SocketEvents.ERROR, { message: 'Invalid team ID' });
          return;
        }

        socket.leave(`team:${teamId}`);
        console.log(`🏢 User ${userId} left team room: ${teamId}`);
        
        socket.emit('team:left', { 
          teamId,
          message: 'Successfully left team room' 
        });
      } catch (error: any) {
        console.error('Error leaving team room:', error);
        socket.emit(SocketEvents.ERROR, { message: 'Failed to leave team room' });
      }
    });

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, (reason: string) => {
      console.log(`🔌 Client disconnected: ${socket.id} | User: ${userId} | Reason: ${reason}`);
    });

    // Handle errors
    socket.on(SocketEvents.ERROR, (error: Error) => {
      console.error(`❌ Socket error for user ${userId}:`, error);
    });
  });

  console.log('✅ Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO server instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Check if Socket.IO is initialized
 */
export const isSocketInitialized = (): boolean => {
  return io !== null;
};
