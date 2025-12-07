import 'reflect-metadata';
import { createServer } from 'http';
import { createApp } from './app';
import { connectDatabase } from './core/database';
import { verifyEmailConnection } from './core/nodemailer.config';
import { initializeSocket } from './core/socket';
import { config } from './environments';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Verify email configuration (non-blocking)
    verifyEmailConnection().catch(() => {
      console.log('⚠️  Email service not configured. Email notifications will be disabled.');
    });

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    initializeSocket(httpServer);

    // Start server
    const PORT = parseInt(process.env.PORT || String(config.port), 10);
    const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Render
    
    httpServer.listen(PORT, HOST, () => {
      console.log('=================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Host: ${HOST}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO ready for connections`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(error.name, error.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(reason);
  process.exit(1);
});

// Start the server
startServer();
