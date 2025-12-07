import { Socket } from 'socket.io';

/**
 * Extended Socket interface with authenticated user data
 */
export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Socket event names
 */
export enum SocketEvents {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Room management
  JOIN_TEAM = 'team:join',
  LEAVE_TEAM = 'team:leave',
  
  // Task events
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
  TASK_STATUS_CHANGED = 'task:status_changed',
  TASK_ASSIGNED = 'task:assigned',
  
  // Team events
  MEMBER_JOINED = 'member:joined',
  MEMBER_REMOVED = 'member:removed',
  MEMBER_ROLE_UPDATED = 'member:role_updated',
  
  // Project events
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_DELETED = 'project:deleted',
}

/**
 * Task event payloads
 */
export interface TaskCreatedPayload {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    dueDate?: Date;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
    project: {
      id: string;
      name: string;
    };
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: Date;
  };
  teamId: string;
  projectId: string;
}

export interface TaskUpdatedPayload {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    dueDate?: Date;
    assignee?: {
      id: string;
      name: string;
      email: string;
    } | null;
    updatedAt: Date;
  };
  changes: Record<string, any>;
  teamId: string;
  projectId: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskDeletedPayload {
  taskId: string;
  taskTitle: string;
  teamId: string;
  projectId: string;
  deletedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  teamId: string;
  projectId: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  };
  teamId: string;
  projectId: string;
  assignedBy: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Team event payloads
 */
export interface MemberJoinedPayload {
  teamId: string;
  teamName: string;
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
    joinedAt: Date;
  };
  addedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MemberRemovedPayload {
  teamId: string;
  teamName: string;
  memberId: string;
  memberName: string;
  removedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MemberRoleUpdatedPayload {
  teamId: string;
  teamName: string;
  member: {
    id: string;
    name: string;
    email: string;
  };
  oldRole: string;
  newRole: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Project event payloads
 */
export interface ProjectCreatedPayload {
  project: {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  };
  teamId: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProjectUpdatedPayload {
  project: {
    id: string;
    name: string;
    description?: string;
    updatedAt: Date;
  };
  changes: Record<string, any>;
  teamId: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProjectDeletedPayload {
  projectId: string;
  projectName: string;
  teamId: string;
  deletedBy: {
    id: string;
    name: string;
    email: string;
  };
}
