import { Document } from 'mongoose';

export enum TeamMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export interface ITeamMember {
  userId: string;
  role: TeamMemberRole;
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  owner: string; // User ID
  members: ITeamMember[];
  createdAt: Date;
  updatedAt: Date;
  // Methods
  isMember(userId: string): boolean;
  isAdminOrOwner(userId: string): boolean;
  getMemberRole(userId: string): TeamMemberRole | null;
}

export interface ITeamResponse {
  id: string;
  name: string;
  description?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: {
    userId: string;
    role: TeamMemberRole;
    joinedAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInviteMemberDto {
  email: string;
  role?: TeamMemberRole;
}

