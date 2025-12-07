import mongoose, { Schema, Model } from 'mongoose';
import { IProject } from '../interfaces/project.interface';

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters long'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
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

// Indexes for faster queries
projectSchema.index({ teamId: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ teamId: 1, createdAt: -1 });

const Project: Model<IProject> = mongoose.model<IProject>('Project', projectSchema);

export default Project;

