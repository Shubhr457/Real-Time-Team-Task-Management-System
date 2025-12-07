import { Response } from 'express';
import Project from '../../../models/project.model';
import Team from '../../../models/team.model';
import User from '../../../models/user.model';
import { ResponseHandler } from '../../../responses';
import { ResponseMessages } from '../../../response-messages';
import { AuthRequest } from '../../../interfaces';
import { CreateProjectDto, UpdateProjectDto } from '../dtos';
import { ActivityService } from '../../../services/activity.service';
import { SocketService } from '../../../services/socket.service';
import { ActivityAction, ActivityEntity } from '../../../interfaces/activity.interface';

export class ProjectController {
  /**
   * Create a new project
   */
  static async createProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, description, teamId }: CreateProjectDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.TEAM_NOT_FOUND);
      }

      // Check if user is a member of the team
      if (!team.isMember(userId)) {
        return ResponseHandler.forbidden(res, ResponseMessages.PROJECT.NOT_TEAM_MEMBER);
      }

      // Create project
      const project = new Project({
        name,
        description,
        teamId,
        createdBy: userId,
      });

      await project.save();

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: teamId,
        action: ActivityAction.CREATED,
        entity: ActivityEntity.PROJECT,
        entityId: (project as any)._id.toString(),
        metadata: {
          projectName: project.name,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Populate team and creator details
      await project.populate([
        { path: 'teamId', select: 'name' },
        { path: 'createdBy', select: 'name email' },
      ]);

      const projectResponse = {
        id: (project as any)._id.toString(),
        name: project.name,
        description: project.description,
        teamId: project.teamId.toString(),
        team: {
          id: (project.teamId as any)._id.toString(),
          name: (project.teamId as any).name,
        },
        createdBy: (project.createdBy as any)._id.toString(),
        creator: {
          id: (project.createdBy as any)._id.toString(),
          name: (project.createdBy as any).name,
          email: (project.createdBy as any).email,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };

      // Emit Socket.IO event for project creation
      SocketService.emitProjectCreated({
        project: {
          id: (project as any)._id.toString(),
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
        },
        teamId: teamId,
        createdBy: {
          id: (project.createdBy as any)._id.toString(),
          name: (project.createdBy as any).name,
          email: (project.createdBy as any).email,
        },
      });

      return ResponseHandler.success(
        res,
        ResponseMessages.PROJECT.CREATED,
        projectResponse,
        201
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Get all projects for a specific team
   */
  static async getTeamProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.TEAM_NOT_FOUND);
      }

      // Check if user is a member of the team
      if (!team.isMember(userId)) {
        return ResponseHandler.forbidden(res, ResponseMessages.PROJECT.NOT_TEAM_MEMBER);
      }

      // Get all projects for the team
      const projects = await Project.find({ teamId })
        .populate('teamId', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

      // Format response
      const formattedProjects = projects.map((project) => ({
        id: (project as any)._id.toString(),
        name: project.name,
        description: project.description,
        teamId: (project.teamId as any)._id.toString(),
        team: {
          id: (project.teamId as any)._id.toString(),
          name: (project.teamId as any).name,
        },
        createdBy: (project.createdBy as any)._id.toString(),
        creator: {
          id: (project.createdBy as any)._id.toString(),
          name: (project.createdBy as any).name,
          email: (project.createdBy as any).email,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));

      return ResponseHandler.success(res, ResponseMessages.PROJECT.LIST_FETCHED, {
        projects: formattedProjects,
        count: formattedProjects.length,
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
   * Get a single project by ID
   */
  static async getProjectById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find project
      const project = await Project.findById(projectId)
        .populate('teamId', 'name')
        .populate('createdBy', 'name email');

      if (!project) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.NOT_FOUND);
      }

      // Verify team membership
      const team = await Team.findById(project.teamId);
      if (!team || !team.isMember(userId)) {
        return ResponseHandler.forbidden(res, ResponseMessages.PROJECT.UNAUTHORIZED);
      }

      return ResponseHandler.success(res, ResponseMessages.PROJECT.FETCHED, {
        id: (project as any)._id.toString(),
        name: project.name,
        description: project.description,
        teamId: (project.teamId as any)._id.toString(),
        team: {
          id: (project.teamId as any)._id.toString(),
          name: (project.teamId as any).name,
        },
        createdBy: (project.createdBy as any)._id.toString(),
        creator: {
          id: (project.createdBy as any)._id.toString(),
          name: (project.createdBy as any).name,
          email: (project.createdBy as any).email,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
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
   * Update a project
   */
  static async updateProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const { name, description }: UpdateProjectDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find project
      const project = await Project.findById(projectId);

      if (!project) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.NOT_FOUND);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(project.teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.TEAM_NOT_FOUND);
      }

      // Check if user is admin or owner of the team
      if (!team.isAdminOrOwner(userId)) {
        return ResponseHandler.forbidden(res, ResponseMessages.PROJECT.UNAUTHORIZED);
      }

      // Track changes for activity log
      const changes: any = {};
      
      // Update project
      if (name !== undefined) {
        changes.name = { old: project.name, new: name };
        project.name = name;
      }
      if (description !== undefined) {
        changes.description = { old: project.description, new: description };
        project.description = description;
      }

      await project.save();

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: project.teamId.toString(),
        action: ActivityAction.UPDATED,
        entity: ActivityEntity.PROJECT,
        entityId: (project as any)._id.toString(),
        metadata: {
          projectName: project.name,
          changes,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Populate details
      await project.populate([
        { path: 'teamId', select: 'name' },
        { path: 'createdBy', select: 'name email' },
      ]);

      // Get updater info
      const updater = await User.findById(userId).select('name email');

      const projectResponse = {
        id: (project as any)._id.toString(),
        name: project.name,
        description: project.description,
        teamId: (project.teamId as any)._id.toString(),
        team: {
          id: (project.teamId as any)._id.toString(),
          name: (project.teamId as any).name,
        },
        createdBy: (project.createdBy as any)._id.toString(),
        creator: {
          id: (project.createdBy as any)._id.toString(),
          name: (project.createdBy as any).name,
          email: (project.createdBy as any).email,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };

      // Emit Socket.IO event for project update
      if (updater) {
        SocketService.emitProjectUpdated({
          project: {
            id: (project as any)._id.toString(),
            name: project.name,
            description: project.description,
            updatedAt: project.updatedAt,
          },
          changes,
          teamId: project.teamId.toString(),
          updatedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      return ResponseHandler.success(res, ResponseMessages.PROJECT.UPDATED, projectResponse);
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find project
      const project = await Project.findById(projectId);

      if (!project) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.NOT_FOUND);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(project.teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.PROJECT.TEAM_NOT_FOUND);
      }

      // Check if user is admin or owner of the team
      if (!team.isAdminOrOwner(userId)) {
        return ResponseHandler.forbidden(res, ResponseMessages.PROJECT.UNAUTHORIZED);
      }

      // Delete project
      await Project.findByIdAndDelete(projectId);

      // Get deleter info
      const deleter = await User.findById(userId).select('name email');

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: project.teamId.toString(),
        action: ActivityAction.DELETED,
        entity: ActivityEntity.PROJECT,
        entityId: projectId,
        metadata: {
          projectName: project.name,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Emit Socket.IO event for project deletion
      if (deleter) {
        SocketService.emitProjectDeleted({
          projectId,
          projectName: project.name,
          teamId: project.teamId.toString(),
          deletedBy: {
            id: userId,
            name: deleter.name,
            email: deleter.email,
          },
        });
      }

      return ResponseHandler.success(res, ResponseMessages.PROJECT.DELETED, {
        id: projectId,
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

