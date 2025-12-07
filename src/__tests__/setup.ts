import 'reflect-metadata';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Override email configuration for testing to avoid actual email sending
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'testpassword';
process.env.EMAIL_HOST = 'smtp.example.com';

// Disable rate limiting for tests
process.env.RATE_LIMIT_WINDOW_MS = '0';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000000';

// Increase timeout for database operations
jest.setTimeout(60000);

// Suppress console logs during tests
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep some errors visible for debugging
  error: jest.fn((message: any, ...args: any[]) => {
    // Suppress email-related errors during tests
    if (typeof message === 'string' && message.includes('Failed to send email')) {
      return;
    }
    originalConsole.error(message, ...args);
  }),
};
