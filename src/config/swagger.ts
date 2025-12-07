import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../environments';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Real-Time Team Task Management System API',
    version: '1.0.0',
    description: `
      A comprehensive real-time task management system API built with Node.js, TypeScript, MongoDB, and Socket.IO.
      
      ## Features
      - User authentication with JWT and OTP verification
      - Role-based access control (Admin, Member, Owner)
      - Team management with member invitations
      - Project management under teams
      - Task lifecycle management (To Do → In Progress → Review → Done)
      - Real-time updates via Socket.IO
      - Activity logging and audit trails
      
      ## Authentication
      Most endpoints require JWT authentication. Include the token in the Authorization header:
      \`Authorization: Bearer <your-jwt-token>\`
    `,
    contact: {
      name: 'API Support',
      email: 'support@taskmanager.com',
    },
    license: {
      name: 'ISC',
    },
  },
  servers: [
    {
      url: config.nodeEnv === 'production' 
        ? 'https://real-time-team-task-management-system-4.onrender.com'
        : `http://localhost:${config.port}`,
      description: config.nodeEnv === 'production' ? 'Production server' : 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      // User Schemas
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          isVerified: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50, example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
        },
      },
      VerifyOTPRequest: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
          },
        },
      },

      // Team Schemas
      TeamMember: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          role: { type: 'string', enum: ['owner', 'admin', 'member'], example: 'member' },
          joinedAt: { type: 'string', format: 'date-time' },
        },
      },
      Team: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'Development Team' },
          description: { type: 'string', example: 'Main development team' },
          owner: { type: 'string', example: '507f1f77bcf86cd799439011' },
          members: {
            type: 'array',
            items: { $ref: '#/components/schemas/TeamMember' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTeamRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Development Team' },
          description: { type: 'string', maxLength: 500, example: 'Main development team for project X' },
        },
      },
      UpdateTeamRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Updated Team Name' },
          description: { type: 'string', maxLength: 500, example: 'Updated description' },
        },
      },
      InviteMemberRequest: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'member@example.com' },
          role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
        },
      },
      UpdateMemberRoleRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'member'], example: 'admin' },
        },
      },

      // Project Schemas
      Project: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'Website Redesign' },
          description: { type: 'string', example: 'Complete redesign of company website' },
          teamId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          createdBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
          status: { type: 'string', enum: ['active', 'completed', 'on-hold'], example: 'active' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name', 'teamId'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 200, example: 'Website Redesign' },
          description: { type: 'string', maxLength: 1000, example: 'Complete redesign of company website' },
          teamId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          status: { type: 'string', enum: ['active', 'completed', 'on-hold'], example: 'active' },
          startDate: { type: 'string', format: 'date', example: '2025-01-01' },
          endDate: { type: 'string', format: 'date', example: '2025-06-30' },
        },
      },
      UpdateProjectRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 200, example: 'Updated Project Name' },
          description: { type: 'string', maxLength: 1000, example: 'Updated description' },
          status: { type: 'string', enum: ['active', 'completed', 'on-hold'], example: 'completed' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },

      // Task Schemas
      Task: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          title: { type: 'string', example: 'Design homepage mockup' },
          description: { type: 'string', example: 'Create initial design mockup for homepage' },
          projectId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          assignedTo: { type: 'string', example: '507f1f77bcf86cd799439011' },
          createdBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
          status: { type: 'string', enum: ['todo', 'in-progress', 'review', 'done'], example: 'todo' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'high' },
          dueDate: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTaskRequest: {
        type: 'object',
        required: ['title', 'projectId'],
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 200, example: 'Design homepage mockup' },
          description: { type: 'string', maxLength: 2000, example: 'Create initial design mockup for homepage' },
          projectId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          assignedTo: { type: 'string', example: '507f1f77bcf86cd799439011' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'high' },
          dueDate: { type: 'string', format: 'date-time', example: '2025-12-31T23:59:59.000Z' },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 200, example: 'Updated task title' },
          description: { type: 'string', maxLength: 2000, example: 'Updated description' },
          assignedTo: { type: 'string', example: '507f1f77bcf86cd799439011' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'urgent' },
          dueDate: { type: 'string', format: 'date-time' },
        },
      },
      UpdateTaskStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['todo', 'in-progress', 'review', 'done'], example: 'in-progress' },
        },
      },

      // Activity Schema
      Activity: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          type: { type: 'string', enum: ['task', 'project', 'team'], example: 'task' },
          action: { type: 'string', example: 'created' },
          description: { type: 'string', example: 'Task "Design homepage" was created' },
          userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          teamId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          entityId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          entityType: { type: 'string', example: 'Task' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // Generic Response Schemas
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          error: { type: 'string', example: 'Detailed error information' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Email is required' },
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Unauthorized',
              error: 'No token provided or invalid token',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'You do not have permission to access this resource',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Forbidden',
              error: 'You do not have permission to perform this action',
            },
          },
        },
      },
      NotFoundError: {
        description: 'The requested resource was not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Not Found',
              error: 'Resource not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and registration endpoints',
    },
    {
      name: 'Teams',
      description: 'Team management endpoints',
    },
    {
      name: 'Projects',
      description: 'Project management endpoints',
    },
    {
      name: 'Tasks',
      description: 'Task management endpoints',
    },
    {
      name: 'Activities',
      description: 'Activity log endpoints',
    },
  ],
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/modules/**/routes/*.ts', './src/app.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
