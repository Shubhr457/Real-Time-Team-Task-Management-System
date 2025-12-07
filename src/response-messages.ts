export const ResponseMessages = {
  // Auth messages
  AUTH: {
    REGISTER_SUCCESS: 'OTP sent to your email. Please verify to complete registration.',
    OTP_SENT: 'OTP sent successfully',
    OTP_VERIFIED: 'Email verified successfully',
    OTP_INVALID: 'Invalid OTP',
    OTP_EXPIRED: 'OTP has expired',
    EMAIL_NOT_VERIFIED: 'Email not verified. Please verify your email first.',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    USER_NOT_FOUND: 'User not found',
    UNAUTHORIZED: 'Unauthorized access',
    TOKEN_INVALID: 'Invalid token',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_MISSING: 'No token provided',
    REFRESH_TOKEN_SUCCESS: 'Token refreshed successfully',
    REFRESH_TOKEN_INVALID: 'Invalid refresh token',
    REFRESH_TOKEN_EXPIRED: 'Refresh token has expired',
    REFRESH_TOKEN_MISSING: 'Refresh token is required',
  },

  // General messages
  GENERAL: {
    SUCCESS: 'Operation successful',
    ERROR: 'An error occurred',
    VALIDATION_ERROR: 'Validation error',
    NOT_FOUND: 'Resource not found',
    INTERNAL_SERVER_ERROR: 'Internal server error',
  },

  // User messages
  USER: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    FETCHED: 'User fetched successfully',
  },

  // Project messages
  PROJECT: {
    CREATED: 'Project created successfully',
    UPDATED: 'Project updated successfully',
    DELETED: 'Project deleted successfully',
    FETCHED: 'Project fetched successfully',
    LIST_FETCHED: 'Projects fetched successfully',
    NOT_FOUND: 'Project not found',
    UNAUTHORIZED: 'You are not authorized to access this project',
    TEAM_NOT_FOUND: 'Team not found',
    NOT_TEAM_MEMBER: 'You are not a member of this team',
  },

  // Task messages
  TASK: {
    CREATED: 'Task created successfully',
    UPDATED: 'Task updated successfully',
    DELETED: 'Task deleted successfully',
    FETCHED: 'Task fetched successfully',
    LIST_FETCHED: 'Tasks fetched successfully',
    MY_TASKS_FETCHED: 'Your assigned tasks fetched successfully',
    STATUS_UPDATED: 'Task status updated successfully',
    NOT_FOUND: 'Task not found',
    UNAUTHORIZED: 'You are not authorized to access this task',
    PROJECT_NOT_FOUND: 'Project not found',
    TEAM_NOT_FOUND: 'Team not found',
    NOT_TEAM_MEMBER: 'You are not a member of this team',
    ASSIGNEE_NOT_FOUND: 'Assignee not found',
  },
};

