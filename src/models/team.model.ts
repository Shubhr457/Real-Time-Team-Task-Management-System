import mongoose, { Schema, Model } from 'mongoose';
import { ITeam, TeamMemberRole } from '../interfaces/team.interface';

const teamMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(TeamMemberRole),
      default: TeamMemberRole.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters long'],
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: String,
      ref: 'User',
      required: [true, 'Team owner is required'],
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        const transformed: any = { ...ret };
        transformed.id = transformed._id;
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      },
    },
  }
);

// Index for faster queries
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.userId': 1 });

// Method to check if user is team member
teamSchema.methods.isMember = function (userId: string): boolean {
  return this.members.some((member: any) => {
    const memberId = member.userId?._id ? (member.userId as any)._id.toString() : member.userId.toString();
    return memberId === userId;
  });
};

// Method to check if user is team admin or owner
teamSchema.methods.isAdminOrOwner = function (userId: string): boolean {
  const ownerId = this.owner?._id ? (this.owner as any)._id.toString() : this.owner.toString();
  if (ownerId === userId) return true;
  return this.members.some((member: any) => {
    const memberId = member.userId?._id ? (member.userId as any)._id.toString() : member.userId.toString();
    return memberId === userId && (member.role === TeamMemberRole.ADMIN || member.role === TeamMemberRole.OWNER);
  });
};

// Method to get member role
teamSchema.methods.getMemberRole = function (userId: string): TeamMemberRole | null {
  // Check if user is owner
  const ownerId = this.owner?._id ? (this.owner as any)._id.toString() : this.owner.toString();
  if (ownerId === userId) return TeamMemberRole.OWNER;
  
  // Check if user is in members (handle both populated and non-populated cases)
  const member = this.members.find((m: any) => {
    const memberId = m.userId?._id ? (m.userId as any)._id.toString() : m.userId.toString();
    return memberId === userId;
  });
  return member ? member.role : null;
};

const Team: Model<ITeam> = mongoose.model<ITeam>('Team', teamSchema);

export default Team;

