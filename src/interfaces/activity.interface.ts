import { Document } from 'mongoose';

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  STATUS_CHANGED = 'status_changed',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  ROLE_CHANGED = 'role_changed',
}

export enum ActivityEntity {
  TASK = 'task',
  PROJECT = 'project',
  TEAM = 'team',
  USER = 'user',
}

export interface IActivity extends Document {
  userId: string;
  teamId: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  metadata?: {
    oldValue?: any;
    newValue?: any;
    description?: string;
    [key: string]: any;
  };
  timestamp: Date;
  createdAt: Date;
}

export interface IActivityResponse {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  teamId: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  metadata?: any;
  timestamp: Date;
}
