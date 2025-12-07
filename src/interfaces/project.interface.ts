import { Document, Types } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  teamId: Types.ObjectId | string; // Reference to Team
  createdBy: Types.ObjectId | string; // Reference to User
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectResponse {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  team?: {
    id: string;
    name: string;
  };
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

