import Activity from '../models/activity.model';
import { ActivityAction, ActivityEntity, IActivity } from '../interfaces/activity.interface';

interface LogActivityParams {
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
}

export class ActivityService {
  /**
   * Log an activity
   */
  static async logActivity(params: LogActivityParams): Promise<IActivity | null> {
    try {
      const activity = new Activity({
        userId: params.userId,
        teamId: params.teamId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata || {},
        timestamp: new Date(),
      });

      await activity.save();
      console.log(`📝 Activity logged: ${params.entity} ${params.action} by user ${params.userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      return null;
    }
  }

  /**
   * Get activities for a team
   */
  static async getTeamActivities(
    teamId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const activities = await Activity.find({ teamId })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return activities;
    } catch (error) {
      console.error('❌ Failed to get team activities:', error);
      return [];
    }
  }

  /**
   * Get activities for a specific entity
   */
  static async getEntityActivities(
    entityId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const activities = await Activity.find({ entityId })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return activities;
    } catch (error) {
      console.error('❌ Failed to get entity activities:', error);
      return [];
    }
  }

  /**
   * Get activities by user
   */
  static async getUserActivities(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const activities = await Activity.find({ userId })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return activities;
    } catch (error) {
      console.error('❌ Failed to get user activities:', error);
      return [];
    }
  }

  /**
   * Get recent activities for a team with filters
   */
  static async getFilteredActivities(
    teamId: string,
    filters: {
      entity?: ActivityEntity;
      action?: ActivityAction;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const query: any = { teamId };

      if (filters.entity) query.entity = filters.entity;
      if (filters.action) query.action = filters.action;
      if (filters.userId) query.userId = filters.userId;
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const activities = await Activity.find(query)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return activities;
    } catch (error) {
      console.error('❌ Failed to get filtered activities:', error);
      return [];
    }
  }

  /**
   * Delete activities for a deleted entity
   */
  static async deleteEntityActivities(entityId: string): Promise<boolean> {
    try {
      await Activity.deleteMany({ entityId });
      console.log(`🗑️  Deleted activities for entity: ${entityId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete entity activities:', error);
      return false;
    }
  }

  /**
   * Get activity statistics for a team
   */
  static async getTeamActivityStats(teamId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await Activity.aggregate([
        {
          $match: {
            teamId,
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              entity: '$entity',
              action: '$action',
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return stats;
    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      return [];
    }
  }
}
