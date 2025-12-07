# Real-Time Team Task Management System (Backend)

A comprehensive real-time task management system built with Node.js, TypeScript, MongoDB, and Socket.IO.

## Features

- ✅ User authentication (Two-step registration with OTP, Login, Logout) with JWT
- ✅ Email verification with OTP (One-Time Password)
- ✅ Role-based access control (Admin, Member)
- ✅ Team management (Create, Update, Delete, Invite Members, Manage Roles)
- ✅ Project management (Create, Update, Delete, List by Team)
- ✅ Task management with complete lifecycle (Create, Update, Delete, Status Transitions)
- ✅ **Activity logging** (Track all task/project changes with detailed audit trail)
- ✅ **Real-time updates with Socket.IO** (Live notifications for all actions)
- 🔒 Secure API with rate limiting and validation

## Tech Stack

- **Backend Framework**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Validation**: Joi
- **Authentication**: JWT (JSON Web Tokens)
- **Real-Time**: Socket.IO
- **Testing**: Jest & Supertest
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── @types/               # TypeScript type definitions
├── core/                 # Core functionality (database, email, socket)
│   ├── database.ts      # MongoDB connection
│   ├── nodemailer.config.ts # Email configuration
│   └── socket.ts        # Socket.IO server setup
├── environments/         # Environment configuration
├── helpers/              # Helper functions and utilities
├── interfaces/           # TypeScript interfaces
│   ├── socket.interface.ts # Socket.IO event types
│   └── ...
├── middlewares/          # Express & Socket middlewares
│   ├── auth.middleware.ts    # JWT authentication for REST
│   ├── socket-auth.middleware.ts # JWT authentication for Socket.IO
│   └── ...
├── models/              # Mongoose models (User, Team, Project, Task, Activity)
├── modules/             # Feature modules
│   ├── activity/       # Activity logging module
│   │   ├── controllers/
│   │   └── routes/
│   ├── admin/
│   │   └── auth/       # Authentication module
│   │       ├── controllers/
│   │       ├── dtos/
│   │       └── routes/
│   ├── project/        # Project management module
│   │   ├── controllers/ (with Socket.IO events)
│   │   ├── dtos/
│   │   └── routes/
│   ├── task/           # Task management module
│   │   ├── controllers/ (with Socket.IO events)
│   │   ├── dtos/
│   │   └── routes/
│   └── team/           # Team management module
│       ├── controllers/ (with Socket.IO events)
│       ├── dtos/
│       └── routes/
├── responses/           # Response handlers
├── services/            # Business logic services
│   ├── email.service.ts    # Email notifications
│   ├── activity.service.ts # Activity logging
│   └── socket.service.ts   # Socket.IO event emissions
├── app.routes.ts        # Route configuration
├── app.ts              # Express app setup
├── response-messages.ts # Response message constants
└── server.ts           # Server entry point (HTTP + Socket.IO)
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Real-Time-Team-Task-Management-System
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/team-task-management

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (for OTP and password emails)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

4. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## API Endpoints

### Authentication

The authentication flow uses a **two-step registration process** with email verification via OTP (One-Time Password).

#### Step 1: Register (Send OTP)
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "member" // optional, defaults to "member"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to complete registration.",
  "data": {
    "email": "john@example.com",
    "message": "Please check your email for the OTP code. It will expire in 10 minutes."
  }
}
```

#### Step 2: Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully! Your password has been sent to your email.",
  "data": {
    "email": "john@example.com",
    "message": "Please check your email for your auto-generated password. You can now login."
  }
}
```

**Note:** After OTP verification, an auto-generated password is sent to the user's email. The user must use this password to login.

#### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "auto-generated-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member"
    },
    "token": "jwt_token_here"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Team Management

All team management endpoints require authentication. Include the JWT token in the Authorization header.

#### Create Team
```http
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Development Team",
  "description": "Team responsible for product development" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "id": "team_id",
    "name": "Development Team",
    "description": "Team responsible for product development",
    "owner": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "memberCount": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get My Teams
```http
GET /api/teams
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Teams fetched successfully",
  "data": {
    "teams": [
      {
        "id": "team_id",
        "name": "Development Team",
        "description": "Team description",
        "owner": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "members": [
          {
            "userId": "user_id",
            "name": "John Doe",
            "email": "john@example.com",
            "role": "owner",
            "joinedAt": "2024-01-01T00:00:00.000Z"
          },
          {
            "userId": "user_id_2",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "role": "admin",
            "joinedAt": "2024-01-02T00:00:00.000Z"
          }
        ],
        "memberCount": 5,
        "userRole": "owner",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### Get Team by ID
```http
GET /api/teams/:teamId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Team fetched successfully",
  "data": {
    "id": "team_id",
    "name": "Development Team",
    "description": "Team description",
    "owner": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "members": [
      {
        "userId": "user_id",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "admin",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "memberCount": 2,
    "userRole": "owner",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Team
```http
PUT /api/teams/:teamId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Team Name", // optional
  "description": "Updated description" // optional
}
```

**Access:** Team admins and owners only

#### Delete Team
```http
DELETE /api/teams/:teamId
Authorization: Bearer <token>
```

**Access:** Team owner only

#### Invite Member to Team
```http
POST /api/teams/:teamId/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "member" // optional, defaults to "member". Options: "member", "admin"
}
```

**Access:** Team admins and owners only

**Response:**
```json
{
  "success": true,
  "message": "Member added to team successfully",
  "data": {
    "teamId": "team_id",
    "member": {
      "userId": "user_id",
      "name": "New Member",
      "email": "newmember@example.com",
      "role": "member"
    }
  }
}
```

#### Remove Member from Team
```http
DELETE /api/teams/:teamId/members/:memberId
Authorization: Bearer <token>
```

**Access:** Team admins and owners only  
**Note:** Cannot remove the team owner

#### Update Member Role
```http
PATCH /api/teams/:teamId/members/:memberId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin" // Options: "member", "admin"
}
```

**Access:** Team owner only  
**Note:** Cannot update the team owner's role

#### Leave Team
```http
POST /api/teams/:teamId/leave
Authorization: Bearer <token>
```

**Access:** Team members only  
**Note:** Team owner cannot leave (must delete team or transfer ownership)

### Project Management

All project management endpoints require authentication. Include the JWT token in the Authorization header.

#### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mobile App Development",
  "description": "Development of iOS and Android mobile applications", // optional
  "teamId": "team_id_here"
}
```

**Access:** Team members only  
**Note:** User must be a member of the specified team

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "project_id",
    "name": "Mobile App Development",
    "description": "Development of iOS and Android mobile applications",
    "teamId": "team_id",
    "team": {
      "id": "team_id",
      "name": "Development Team"
    },
    "createdBy": "user_id",
    "creator": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Team Projects
```http
GET /api/projects/team/:teamId
Authorization: Bearer <token>
```

**Access:** Team members only

**Response:**
```json
{
  "success": true,
  "message": "Projects fetched successfully",
  "data": {
    "projects": [
      {
        "id": "project_id",
        "name": "Mobile App Development",
        "description": "Development of iOS and Android mobile applications",
        "teamId": "team_id",
        "team": {
          "id": "team_id",
          "name": "Development Team"
        },
        "createdBy": "user_id",
        "creator": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

#### Get Project by ID
```http
GET /api/projects/:projectId
Authorization: Bearer <token>
```

**Access:** Team members only

**Response:**
```json
{
  "success": true,
  "message": "Project fetched successfully",
  "data": {
    "id": "project_id",
    "name": "Mobile App Development",
    "description": "Development of iOS and Android mobile applications",
    "teamId": "team_id",
    "team": {
      "id": "team_id",
      "name": "Development Team"
    },
    "createdBy": "user_id",
    "creator": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Project
```http
PUT /api/projects/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name", // optional
  "description": "Updated description" // optional
}
```

**Access:** Team admins and owners only

**Response:**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "project_id",
    "name": "Updated Project Name",
    "description": "Updated description",
    "teamId": "team_id",
    "team": {
      "id": "team_id",
      "name": "Development Team"
    },
    "createdBy": "user_id",
    "creator": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Delete Project
```http
DELETE /api/projects/:projectId
Authorization: Bearer <token>
```

**Access:** Team admins and owners only

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully",
  "data": {
    "id": "project_id"
  }
}
```

### Task Management

All task management endpoints require authentication and team membership. Include the JWT token in the Authorization header.

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API", // optional
  "priority": "high", // Options: "low", "medium", "high", "urgent"
  "status": "todo", // Options: "todo", "in_progress", "review", "done"
  "dueDate": "2024-12-31T23:59:59.000Z", // optional
  "assignee": "user_id", // optional
  "projectId": "project_id"
}
```

**Access:** Team members only

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "task_id",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to the API",
    "priority": "high",
    "status": "todo",
    "dueDate": "2024-12-31T23:59:59.000Z",
    "assignee": {
      "id": "user_id",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "project": {
      "id": "project_id",
      "name": "Backend API"
    },
    "createdBy": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Project Tasks
```http
GET /api/tasks/project/:projectId
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (todo, in_progress, review, done)
- `priority` (optional): Filter by priority (low, medium, high, urgent)
- `assignee` (optional): Filter by assignee user ID

**Access:** Team members only

#### Get Task by ID
```http
GET /api/tasks/:taskId
Authorization: Bearer <token>
```

**Access:** Team members only

#### Get My Tasks
```http
GET /api/tasks/me
Authorization: Bearer <token>
```

Get all tasks assigned to the current user.

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority

#### Update Task
```http
PUT /api/tasks/:taskId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated task title", // optional
  "description": "Updated description", // optional
  "priority": "urgent", // optional
  "status": "in_progress", // optional
  "dueDate": "2024-12-31T23:59:59.000Z", // optional
  "assignee": "user_id" // optional
}
```

**Access:** Team members only  
**Note:** Status transitions are validated (e.g., can't skip from TODO directly to DONE)

#### Update Task Status
```http
PATCH /api/tasks/:taskId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Access:** Team members only

#### Delete Task
```http
DELETE /api/tasks/:taskId
Authorization: Bearer <token>
```

**Access:** Team admins/owners or task creator only

### Activity Logging

The system automatically tracks all task and project changes. All activity endpoints require authentication.

#### Get Team Activities
```http
GET /api/activities/teams/:teamId
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `entity` (string): Filter by entity type (task, project)
- `action` (string): Filter by action (created, updated, deleted, assigned, unassigned, status_changed)
- `userId` (string): Filter by user who performed the action

**Access:** Team members only

**Response:**
```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": {
    "activities": [
      {
        "id": "activity_id",
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "teamId": "team_id",
        "action": "created",
        "entity": "task",
        "entityId": "task_id",
        "metadata": {
          "taskTitle": "Implement login feature",
          "priority": "high",
          "status": "todo",
          "assignee": "user_id"
        },
        "timestamp": "2024-01-01T10:30:00.000Z"
      },
      {
        "id": "activity_id_2",
        "userId": "user_id",
        "userName": "Jane Smith",
        "userEmail": "jane@example.com",
        "teamId": "team_id",
        "action": "status_changed",
        "entity": "task",
        "entityId": "task_id",
        "metadata": {
          "taskTitle": "Implement login feature",
          "oldStatus": "todo",
          "newStatus": "in_progress"
        },
        "timestamp": "2024-01-01T11:00:00.000Z"
      }
    ],
    "count": 2,
    "page": 1,
    "limit": 50
  }
}
```

#### Get Entity Activities
```http
GET /api/activities/entity/:entityId
Authorization: Bearer <token>
```

Get all activities for a specific task or project.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

**Access:** Team members only

#### Get My Activities
```http
GET /api/activities/me
Authorization: Bearer <token>
```

Get all activities performed by the current user across all teams.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

#### Get Team Activity Statistics
```http
GET /api/activities/teams/:teamId/stats
Authorization: Bearer <token>
```

Get aggregated statistics about team activities.

**Query Parameters:**
- `days` (number): Number of days to include (default: 30)

**Access:** Team members only

**Response:**
```json
{
  "success": true,
  "message": "Activity statistics retrieved successfully",
  "data": {
    "stats": [
      {
        "_id": {
          "entity": "task",
          "action": "created"
        },
        "count": 45
      },
      {
        "_id": {
          "entity": "task",
          "action": "status_changed"
        },
        "count": 120
      }
    ],
    "period": "30 days"
  }
}
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Registration Process

The registration process consists of two steps:

1. **Register**: Submit name, email, and optional role. An OTP will be sent to the provided email address.
2. **Verify OTP**: Submit the OTP received via email. Upon successful verification, an auto-generated password will be sent to the user's email.

After receiving the password, users can login using their email and the auto-generated password.

### Team Roles

Teams have three role levels:

- **Owner**: Can perform all actions including deleting the team and updating member roles
- **Admin**: Can update team details, invite/remove members (except owner)
- **Member**: Can view team details and leave the team

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details",
  "errors": [ /* validation errors array */ ]
}
```

## Validation

Request validation is handled using Joi. Validation errors return a 422 status code with detailed error information.

## Security Features

- **Helmet**: Sets security-related HTTP headers
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Prevents brute force attacks
- **JWT**: Secure token-based authentication
- **Password Hashing**: Passwords are hashed using bcrypt
- **OTP Verification**: Email verification with time-limited OTP (10 minutes expiry)
- **OTP Hashing**: OTPs are hashed before storage using SHA256
- **Auto-generated Passwords**: Secure random password generation for new users

## Development

### Database Setup

Make sure MongoDB is running locally or configure MongoDB Atlas connection string in your `.env` file.

### Code Style

The project uses ESLint for code linting. Run `npm run lint` to check for issues.

## Activity Tracking

The system includes a comprehensive activity logging system that automatically tracks:

### Tracked Activities

- **Task Activities**:
  - ✅ Task creation
  - ✅ Task updates (with change tracking)
  - ✅ Task deletion
  - ✅ Task assignment/unassignment
  - ✅ Status changes (with old/new values)

- **Project Activities**:
  - ✅ Project creation
  - ✅ Project updates (with change tracking)
  - ✅ Project deletion

- **Team Activities** (Coming soon):
  - Member added/removed
  - Role changes

### Activity Features

- **Detailed Metadata**: Each activity includes contextual information (task title, old/new values, etc.)
- **User Attribution**: Track who performed each action
- **Timestamp**: Precise time tracking for all activities
- **Filtering**: Filter activities by entity type, action, user, or date range
- **Statistics**: Aggregated team activity insights
- **Auto-cleanup**: Activities older than 90 days are automatically removed
- **Performance Optimized**: Multiple indexes for fast queries

For detailed documentation, see [Activity Logging Documentation](./src/docs/ACTIVITY_LOGGING.md)

## Real-Time Updates with Socket.IO

The application now supports real-time updates using Socket.IO! All team members receive instant notifications when actions occur.

### 🔌 Socket.IO Features

#### **Connection & Authentication**
- JWT-based authentication for Socket.IO connections
- Automatic user room assignment for personal notifications
- Team-based room management for collaborative updates

#### **Real-Time Events**

**Task Events:**
- `task:created` - New task added to project
- `task:updated` - Task details modified
- `task:deleted` - Task removed
- `task:status_changed` - Task status transition (To Do → In Progress → Review → Done)
- `task:assigned` - Task assigned to team member

**Team Events:**
- `member:joined` - New member added to team
- `member:removed` - Member removed from team
- `member:role_updated` - Member role changed

**Project Events:**
- `project:created` - New project created
- `project:updated` - Project details modified
- `project:deleted` - Project removed

### 🚀 Getting Started with Socket.IO

#### **Client Connection (Browser/Node.js)**

```javascript
import { io } from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token-here' }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected!', socket.id);
});

// Join team room to receive team events
socket.emit('team:join', { teamId: 'your-team-id' });

// Listen for task events
socket.on('task:created', (data) => {
  console.log('New task:', data);
  // Update UI
});

socket.on('task:assigned', (data) => {
  if (data.isPersonal) {
    // This is a personal notification to you
    showNotification(`You've been assigned: ${data.taskTitle}`);
  }
});

// Listen for team events
socket.on('member:joined', (data) => {
  console.log('New member:', data.member.name);
});
```

#### **Testing Socket.IO**

The project includes multiple test utilities:

1. **HTML Test Page**: Open `test-socket.html` in your browser for visual testing
2. **Node.js Test Scripts**: 
   - `node test-socket.js` - Basic connection test
   - `node test-socket-full.js` - Full integration test with API calls

### 📡 Event Broadcasting

Events are broadcast in two ways:

1. **Team Room Broadcast**: All connected team members receive the event
2. **Personal Notifications**: Directly affected users receive additional personal notifications

Example: When a task is assigned to Tanya:
- **Team room** receives `task:assigned` (all team members see it)
- **Tanya's personal room** receives `task:assigned` with `isPersonal: true` flag

### 🔒 Security

- All Socket.IO connections require valid JWT authentication
- Users can only join team rooms they are members of
- Events are only broadcast to authorized team members
- Automatic disconnection on authentication failure

For detailed Socket.IO documentation, API examples, and troubleshooting, see the **[Socket.IO Guide](./SOCKET_IO_GUIDE.md)** (if available).

---

## Coming Soon

- 📚 Swagger API documentation
- 🧪 Comprehensive test coverage
- 🚀 Vercel deployment configuration
- 🔐 Password reset functionality
- 📊 Advanced analytics dashboard
- 📊 Enhanced activity analytics and dashboards

## License

ISC

## Author

Your Name
