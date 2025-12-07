import { Response } from 'express';
import Task from '../../../models/task.model';
import Project from '../../../models/project.model';
import Team from '../../../models/team.model';
import User from '../../../models/user.model';
import { ResponseHandler } from '../../../responses';
import { ResponseMessages } from '../../../response-messages';
import { AuthRequest } from '../../../interfaces';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from '../dtos';
import { ActivityService } from '../../../services/activity.service';
import { SocketService } from '../../../services/socket.service';
import { ActivityAction, ActivityEntity } from '../../../interfaces/activity.interface';

export class TaskController {
  /**
   * Create a new task
   */
  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const taskData: CreateTaskDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify project exists
      const project = await Project.findById(taskData.projectId);
      if (!project) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.PROJECT_NOT_FOUND);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(project.teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.TEAM_NOT_FOUND);
      }

      if (!team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          ResponseMessages.TASK.NOT_TEAM_MEMBER,
          'Forbidden',
          403
        );
      }

      // If assignee is provided, verify they exist and are team members
      if (taskData.assignee) {
        const assignee = await User.findById(taskData.assignee);
        if (!assignee) {
          return ResponseHandler.notFound(res, ResponseMessages.TASK.ASSIGNEE_NOT_FOUND);
        }

        if (!team.isMember(taskData.assignee)) {
          return ResponseHandler.error(
            res,
            'Assignee must be a member of the team',
            'Invalid Assignee',
            400
          );
        }
      }

      // Create task
      const task = new Task({
        ...taskData,
        createdBy: userId,
      });

      await task.save();

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: (team as any)._id.toString(),
        action: ActivityAction.CREATED,
        entity: ActivityEntity.TASK,
        entityId: (task as any)._id.toString(),
        metadata: {
          taskTitle: task.title,
          priority: task.priority,
          status: task.status,
          assignee: task.assignee?.toString(),
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Populate references
      await task.populate([
        { path: 'projectId', select: 'name' },
        { path: 'assignee', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
      ]);

      const taskResponse = {
        id: (task as any)._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee
          ? {
              id: (task.assignee as any)._id.toString(),
              name: (task.assignee as any).name,
              email: (task.assignee as any).email,
            }
          : null,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        createdBy: {
          id: (task.createdBy as any)._id.toString(),
          name: (task.createdBy as any).name,
          email: (task.createdBy as any).email,
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      // Emit Socket.IO event for task creation
      SocketService.emitTaskCreated({
        task: {
          ...taskResponse,
          assignee: taskResponse.assignee || undefined,
        },
        teamId: (team as any)._id.toString(),
        projectId: (project as any)._id.toString(),
      });

      return ResponseHandler.success(
        res,
        ResponseMessages.TASK.CREATED,
        taskResponse,
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
   * Get all tasks for a specific project
   */
  static async getProjectTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Verify project exists
      const project = await Project.findById(projectId);
      if (!project) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.PROJECT_NOT_FOUND);
      }

      // Verify team exists and user is a member
      const team = await Team.findById(project.teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.TEAM_NOT_FOUND);
      }

      if (!team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          ResponseMessages.TASK.NOT_TEAM_MEMBER,
          'Forbidden',
          403
        );
      }

      // Get query parameters for filtering
      const { status, priority, assignee } = req.query;
      const filter: any = { projectId };

      if (status) {
        filter.status = status;
      }
      if (priority) {
        filter.priority = priority;
      }
      if (assignee) {
        filter.assignee = assignee;
      }

      // Get tasks with pagination to prevent memory issues
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500); // Max 500 tasks per request
      const skip = (page - 1) * limit;

      // Get all tasks for the project
      const tasks = await Task.find(filter)
        .populate('projectId', 'name')
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const totalCount = await Task.countDocuments(filter);

      // Format response
      const formattedTasks = tasks.map((task) => ({
        id: (task as any)._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee
          ? {
              id: (task.assignee as any)._id.toString(),
              name: (task.assignee as any).name,
              email: (task.assignee as any).email,
            }
          : null,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        createdBy: {
          id: (task.createdBy as any)._id.toString(),
          name: (task.createdBy as any).name,
          email: (task.createdBy as any).email,
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));

      return ResponseHandler.success(res, ResponseMessages.TASK.LIST_FETCHED, {
        tasks: formattedTasks,
        count: formattedTasks.length,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        filters: { status, priority, assignee },
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
   * Get a single task by ID
   */
  static async getTaskById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find task
      const task = await Task.findById(taskId)
        .populate('projectId', 'name teamId')
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email');

      if (!task) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.NOT_FOUND);
      }

      // Verify team membership
      const team = await Team.findById((task.projectId as any).teamId);
      if (!team || !team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          ResponseMessages.TASK.UNAUTHORIZED,
          'Forbidden',
          403
        );
      }

      return ResponseHandler.success(res, ResponseMessages.TASK.FETCHED, {
        id: (task as any)._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee
          ? {
              id: (task.assignee as any)._id.toString(),
              name: (task.assignee as any).name,
              email: (task.assignee as any).email,
            }
          : null,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        createdBy: {
          id: (task.createdBy as any)._id.toString(),
          name: (task.createdBy as any).name,
          email: (task.createdBy as any).email,
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
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
   * Update task details
   */
  static async updateTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.params;
      const updateData: UpdateTaskDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find task
      const task = await Task.findById(taskId).populate('projectId', 'teamId');

      if (!task) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.NOT_FOUND);
      }

      // Verify team membership
      const team = await Team.findById((task.projectId as any).teamId);
      if (!team || !team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          ResponseMessages.TASK.UNAUTHORIZED,
          'Forbidden',
          403
        );
      }

      // If assignee is being updated, verify they exist and are team members
      if (updateData.assignee) {
        const assignee = await User.findById(updateData.assignee);
        if (!assignee) {
          return ResponseHandler.notFound(res, ResponseMessages.TASK.ASSIGNEE_NOT_FOUND);
        }

        if (!team.isMember(updateData.assignee)) {
          return ResponseHandler.error(
            res,
            'Assignee must be a member of the team',
            'Invalid Assignee',
            400
          );
        }
      }

      // Track changes for activity log
      const changes: any = {};
      const oldAssignee = task.assignee?.toString();
      const oldStatus = task.status;
      
      // Update task fields
      if (updateData.title !== undefined) {
        changes.title = { old: task.title, new: updateData.title };
        task.title = updateData.title;
      }
      if (updateData.description !== undefined) task.description = updateData.description;
      if (updateData.priority !== undefined) {
        changes.priority = { old: task.priority, new: updateData.priority };
        task.priority = updateData.priority;
      }
      if (updateData.status !== undefined) {
        // Validate status transition
        if (!(task as any).canTransitionTo(updateData.status)) {
          return ResponseHandler.error(
            res,
            `Cannot transition from ${task.status} to ${updateData.status}`,
            'Invalid Status Transition',
            400
          );
        }
        changes.status = { old: task.status, new: updateData.status };
        task.status = updateData.status;
      }
      if (updateData.dueDate !== undefined) task.dueDate = updateData.dueDate;
      if (updateData.assignee !== undefined) {
        changes.assignee = { old: oldAssignee, new: updateData.assignee };
        task.assignee = updateData.assignee;
      }

      await task.save();

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: (team as any)._id.toString(),
        action: ActivityAction.UPDATED,
        entity: ActivityEntity.TASK,
        entityId: (task as any)._id.toString(),
        metadata: {
          taskTitle: task.title,
          changes,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Log separate activity for assignment change
      if (updateData.assignee !== undefined && oldAssignee !== updateData.assignee) {
        ActivityService.logActivity({
          userId,
          teamId: (team as any)._id.toString(),
          action: updateData.assignee ? ActivityAction.ASSIGNED : ActivityAction.UNASSIGNED,
          entity: ActivityEntity.TASK,
          entityId: (task as any)._id.toString(),
          metadata: {
            taskTitle: task.title,
            oldAssignee,
            newAssignee: updateData.assignee,
          },
        }).catch(err => console.error('Failed to log activity:', err));
      }

      // Log separate activity for status change
      if (updateData.status !== undefined && oldStatus !== updateData.status) {
        ActivityService.logActivity({
          userId,
          teamId: (team as any)._id.toString(),
          action: ActivityAction.STATUS_CHANGED,
          entity: ActivityEntity.TASK,
          entityId: (task as any)._id.toString(),
          metadata: {
            taskTitle: task.title,
            oldStatus,
            newStatus: updateData.status,
          },
        }).catch(err => console.error('Failed to log activity:', err));
      }

      // Populate references
      await task.populate([
        { path: 'projectId', select: 'name' },
        { path: 'assignee', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
      ]);

      // Get updater info
      const updater = await User.findById(userId).select('name email');
      
      const taskResponse = {
        id: (task as any)._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee
          ? {
              id: (task.assignee as any)._id.toString(),
              name: (task.assignee as any).name,
              email: (task.assignee as any).email,
            }
          : null,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        createdBy: {
          id: (task.createdBy as any)._id.toString(),
          name: (task.createdBy as any).name,
          email: (task.createdBy as any).email,
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      // Emit Socket.IO event for task update
      if (updater) {
        SocketService.emitTaskUpdated({
          task: {
            ...taskResponse,
            assignee: taskResponse.assignee || undefined,
          },
          changes,
          teamId: (team as any)._id.toString(),
          projectId: (task.projectId as any)._id.toString(),
          updatedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      // Emit status change event if status was updated
      if (updateData.status !== undefined && oldStatus !== updateData.status && updater) {
        SocketService.emitTaskStatusChanged({
          taskId: (task as any)._id.toString(),
          taskTitle: task.title,
          oldStatus,
          newStatus: updateData.status,
          teamId: (team as any)._id.toString(),
          projectId: (task.projectId as any)._id.toString(),
          changedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      // Emit assignment event if assignee was updated
      if (updateData.assignee !== undefined && oldAssignee !== updateData.assignee && updateData.assignee && updater) {
        const assignee = task.assignee as any;
        SocketService.emitTaskAssigned({
          taskId: (task as any)._id.toString(),
          taskTitle: task.title,
          assignee: {
            id: (assignee as any)._id.toString(),
            name: assignee.name,
            email: assignee.email,
          },
          teamId: (team as any)._id.toString(),
          projectId: (task.projectId as any)._id.toString(),
          assignedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      return ResponseHandler.success(res, ResponseMessages.TASK.UPDATED, taskResponse);
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  /**
   * Update task status only
   */
  static async updateTaskStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.params;
      const { status }: UpdateTaskStatusDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find task
      const task = await Task.findById(taskId).populate('projectId', 'teamId');

      if (!task) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.NOT_FOUND);
      }

      // Verify team membership
      const team = await Team.findById((task.projectId as any).teamId);
      if (!team || !team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          ResponseMessages.TASK.UNAUTHORIZED,
          'Forbidden',
          403
        );
      }

      // Validate status transition
      if (!(task as any).canTransitionTo(status)) {
        return ResponseHandler.error(
          res,
          `Cannot transition from ${task.status} to ${status}`,
          'Invalid Status Transition',
          400
        );
      }

      // Store old status before update
      const oldStatus = task.status;
      
      // Update status
      task.status = status;
      await task.save();

      // Populate references
      await task.populate([
        { path: 'projectId', select: 'name' },
        { path: 'assignee', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
      ]);

      // Get updater info for socket event
      const updater = await User.findById(userId).select('name email');

      // Emit Socket.IO event for status change
      if (updater) {
        SocketService.emitTaskStatusChanged({
          taskId: (task as any)._id.toString(),
          taskTitle: task.title,
          oldStatus,
          newStatus: status,
          teamId: (team as any)._id.toString(),
          projectId: (task.projectId as any)._id.toString(),
          changedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      return ResponseHandler.success(res, ResponseMessages.TASK.STATUS_UPDATED, {
        id: (task as any)._id.toString(),
        title: task.title,
        status: task.status,
        previousStatus: oldStatus,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        updatedAt: task.updatedAt,
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
   * Delete a task
   */
  static async deleteTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find task
      const task = await Task.findById(taskId).populate('projectId', 'teamId');

      if (!task) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.NOT_FOUND);
      }

      // Verify team membership and permissions
      const team = await Team.findById((task.projectId as any).teamId);
      if (!team) {
        return ResponseHandler.notFound(res, ResponseMessages.TASK.TEAM_NOT_FOUND);
      }

      // Only team admins/owners or task creator can delete tasks
      if (!team.isAdminOrOwner(userId) && task.createdBy.toString() !== userId) {
        return ResponseHandler.error(
          res,
          'Only team admins/owners or task creator can delete tasks',
          'Forbidden',
          403
        );
      }

      // Delete task
      await Task.findByIdAndDelete(taskId);

      // Get deleter info for socket event
      const deleter = await User.findById(userId).select('name email');

      // Log activity
      ActivityService.logActivity({
        userId,
        teamId: (team as any)._id.toString(),
        action: ActivityAction.DELETED,
        entity: ActivityEntity.TASK,
        entityId: taskId,
        metadata: {
          taskTitle: task.title,
        },
      }).catch(err => console.error('Failed to log activity:', err));

      // Emit Socket.IO event for task deletion
      if (deleter) {
        SocketService.emitTaskDeleted({
          taskId,
          taskTitle: task.title,
          teamId: (team as any)._id.toString(),
          projectId: (task.projectId as any)._id.toString(),
          deletedBy: {
            id: userId,
            name: deleter.name,
            email: deleter.email,
          },
        });
      }

      return ResponseHandler.success(res, ResponseMessages.TASK.DELETED, {
        id: taskId,
        title: task.title,
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
   * Get user's assigned tasks
   */
  static async getMyTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Get query parameters for filtering
      const { status, priority } = req.query;
      const filter: any = { assignee: userId };

      if (status) {
        filter.status = status;
      }
      if (priority) {
        filter.priority = priority;
      }

      // Get query parameters for pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const skip = (page - 1) * limit;

      // Get all tasks assigned to user
      const tasks = await Task.find(filter)
        .populate('projectId', 'name')
        .populate('assignee', 'name email')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const totalCount = await Task.countDocuments(filter);

      // Format response
      const formattedTasks = tasks.map((task) => ({
        id: (task as any)._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignee: task.assignee
          ? {
              id: (task.assignee as any)._id.toString(),
              name: (task.assignee as any).name,
              email: (task.assignee as any).email,
            }
          : null,
        project: {
          id: (task.projectId as any)._id.toString(),
          name: (task.projectId as any).name,
        },
        createdBy: {
          id: (task.createdBy as any)._id.toString(),
          name: (task.createdBy as any).name,
          email: (task.createdBy as any).email,
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));

      return ResponseHandler.success(res, ResponseMessages.TASK.MY_TASKS_FETCHED, {
        tasks: formattedTasks,
        count: formattedTasks.length,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        filters: { status, priority },
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

