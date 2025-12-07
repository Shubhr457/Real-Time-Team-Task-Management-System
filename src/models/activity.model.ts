import mongoose, { Schema, Model } from 'mongoose';
import { IActivity, ActivityAction, ActivityEntity } from '../interfaces/activity.interface';

const activitySchema = new Schema<IActivity>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    teamId: {
      type: String,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: [true, 'Action is required'],
      index: true,
    },
    entity: {
      type: String,
      enum: Object.values(ActivityEntity),
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
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

// Compound indexes for efficient queries
activitySchema.index({ teamId: 1, timestamp: -1 });
activitySchema.index({ entityId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ teamId: 1, entity: 1, timestamp: -1 });

// TTL index to auto-delete old activities (optional - keeps last 90 days)
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const Activity: Model<IActivity> = mongoose.model<IActivity>('Activity', activitySchema);

export default Activity;
