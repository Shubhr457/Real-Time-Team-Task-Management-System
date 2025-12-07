import { Response } from 'express';
import { ResponseHandler } from '../../../responses';
import { ResponseMessages } from '../../../response-messages';
import { AuthRequest } from '../../../interfaces';
import { ActivityService } from '../../../services/activity.service';
import { ActivityAction, ActivityEntity } from '../../../interfaces/activity.interface';
import Team from '../../../models/team.model';

export class ActivityController {
  /**
   * Get activities for a team
   */
  static async getTeamActivities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(teamId);
      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      if (!team.isMember(userId)) {
        return ResponseHandler.forbidden(res, 'You are not a member of this team');
      }

      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const entity = req.query.entity as ActivityEntity;
      const action = req.query.action as ActivityAction;
      const filterUserId = req.query.userId as string;

      // Get filtered activities
      const activities = await ActivityService.getFilteredActivities(
        teamId,
        { entity, action, userId: filterUserId },
        limit,
        skip
      );

      // Format response
      const formattedActivities = activities.map((activity: any) => ({
        id: activity._id?.toString() || activity.id,
        userId: activity.userId._id?.toString() || activity.userId,
        userName: activity.userId.name,
        userEmail: activity.userId.email,
        teamId: activity.teamId,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        metadata: activity.metadata,
        timestamp: activity.timestamp,
      }));

      return ResponseHandler.success(res, 'Activities retrieved successfully', {
        activities: formattedActivities,
        count: formattedActivities.length,
        page,
        limit,
      });
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Get activities for a specific entity (project or task)
   */
  static async getEntityActivities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { entityId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Get activities
      const activities = await ActivityService.getEntityActivities(entityId, limit, skip);

      if (activities.length === 0) {
        return ResponseHandler.success(res, 'No activities found', {
          activities: [],
          count: 0,
          page,
          limit,
        });
      }

      // Verify user has access to this entity's team
      const firstActivity = activities[0] as any;
      const team = await Team.findById(firstActivity.teamId);
      
      if (!team || !team.isMember(userId)) {
        return ResponseHandler.forbidden(res, 'You do not have access to this entity');
      }

      // Format response
      const formattedActivities = activities.map((activity: any) => ({
        id: activity._id?.toString() || activity.id,
        userId: activity.userId._id?.toString() || activity.userId,
        userName: activity.userId.name,
        userEmail: activity.userId.email,
        teamId: activity.teamId,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        metadata: activity.metadata,
        timestamp: activity.timestamp,
      }));

      return ResponseHandler.success(res, 'Entity activities retrieved successfully', {
        activities: formattedActivities,
        count: formattedActivities.length,
        page,
        limit,
      });
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Get current user's activities across all teams
   */
  static async getMyActivities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Get user activities
      const activities = await ActivityService.getUserActivities(userId, limit, skip);

      // Format response
      const formattedActivities = activities.map((activity: any) => ({
        id: activity._id?.toString() || activity.id,
        userId: activity.userId._id?.toString() || activity.userId,
        userName: activity.userId.name,
        userEmail: activity.userId.email,
        teamId: activity.teamId,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        metadata: activity.metadata,
        timestamp: activity.timestamp,
      }));

      return ResponseHandler.success(res, 'Your activities retrieved successfully', {
        activities: formattedActivities,
        count: formattedActivities.length,
        page,
        limit,
      });
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Get activity statistics for a team
   */
  static async getTeamActivityStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(teamId);
      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      if (!team.isMember(userId)) {
        return ResponseHandler.forbidden(res, 'You are not a member of this team');
      }

      // Get days parameter (default 30 days)
      const days = parseInt(req.query.days as string) || 30;

      // Get statistics
      const stats = await ActivityService.getTeamActivityStats(teamId, days);

      return ResponseHandler.success(res, 'Activity statistics retrieved successfully', {
        stats,
        period: `${days} days`,
      });
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
}
