import { getIO, isSocketInitialized } from '../core/socket';
import {
  SocketEvents,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskDeletedPayload,
  TaskStatusChangedPayload,
  TaskAssignedPayload,
  MemberJoinedPayload,
  MemberRemovedPayload,
  MemberRoleUpdatedPayload,
  ProjectCreatedPayload,
  ProjectUpdatedPayload,
  ProjectDeletedPayload,
} from '../interfaces/socket.interface';

/**
 * Socket Service for emitting real-time events
 */
export class SocketService {
  /**
   * Emit task created event to team members
   */
  static emitTaskCreated(payload: TaskCreatedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.TASK_CREATED, payload);
      console.log(`📤 Emitted ${SocketEvents.TASK_CREATED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit task created event:', error);
    }
  }

  /**
   * Emit task updated event to team members
   */
  static emitTaskUpdated(payload: TaskUpdatedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.TASK_UPDATED, payload);
      console.log(`📤 Emitted ${SocketEvents.TASK_UPDATED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit task updated event:', error);
    }
  }

  /**
   * Emit task deleted event to team members
   */
  static emitTaskDeleted(payload: TaskDeletedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.TASK_DELETED, payload);
      console.log(`📤 Emitted ${SocketEvents.TASK_DELETED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit task deleted event:', error);
    }
  }

  /**
   * Emit task status changed event to team members
   */
  static emitTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.TASK_STATUS_CHANGED, payload);
      console.log(`📤 Emitted ${SocketEvents.TASK_STATUS_CHANGED} to ${roomName}`);
      
      // Also notify the assignee if exists
      if (payload.taskId) {
        // We'll emit to the task assignee's personal room if needed
        // This is handled in the controller where we have assignee info
      }
    } catch (error) {
      console.error('❌ Failed to emit task status changed event:', error);
    }
  }

  /**
   * Emit task assigned event to team members and assignee
   */
  static emitTaskAssigned(payload: TaskAssignedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      // Emit to team room
      io.to(roomName).emit(SocketEvents.TASK_ASSIGNED, payload);
      console.log(`📤 Emitted ${SocketEvents.TASK_ASSIGNED} to ${roomName}`);
      
      // Also emit to assignee's personal room for direct notification
      if (payload.assignee?.id) {
        io.to(`user:${payload.assignee.id}`).emit(SocketEvents.TASK_ASSIGNED, {
          ...payload,
          isPersonal: true,
        });
        console.log(`📤 Emitted ${SocketEvents.TASK_ASSIGNED} to user:${payload.assignee.id}`);
      }
    } catch (error) {
      console.error('❌ Failed to emit task assigned event:', error);
    }
  }

  /**
   * Emit member joined event to team members
   */
  static emitMemberJoined(payload: MemberJoinedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.MEMBER_JOINED, payload);
      console.log(`📤 Emitted ${SocketEvents.MEMBER_JOINED} to ${roomName}`);
      
      // Also notify the new member personally
      io.to(`user:${payload.member.id}`).emit(SocketEvents.MEMBER_JOINED, {
        ...payload,
        isPersonal: true,
        message: `You have been added to ${payload.teamName}`,
      });
    } catch (error) {
      console.error('❌ Failed to emit member joined event:', error);
    }
  }

  /**
   * Emit member removed event to team members
   */
  static emitMemberRemoved(payload: MemberRemovedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.MEMBER_REMOVED, payload);
      console.log(`📤 Emitted ${SocketEvents.MEMBER_REMOVED} to ${roomName}`);
      
      // Notify the removed member
      io.to(`user:${payload.memberId}`).emit(SocketEvents.MEMBER_REMOVED, {
        ...payload,
        isPersonal: true,
        message: `You have been removed from ${payload.teamName}`,
      });
    } catch (error) {
      console.error('❌ Failed to emit member removed event:', error);
    }
  }

  /**
   * Emit member role updated event to team members
   */
  static emitMemberRoleUpdated(payload: MemberRoleUpdatedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.MEMBER_ROLE_UPDATED, payload);
      console.log(`📤 Emitted ${SocketEvents.MEMBER_ROLE_UPDATED} to ${roomName}`);
      
      // Notify the member whose role was updated
      io.to(`user:${payload.member.id}`).emit(SocketEvents.MEMBER_ROLE_UPDATED, {
        ...payload,
        isPersonal: true,
        message: `Your role in ${payload.teamName} has been changed from ${payload.oldRole} to ${payload.newRole}`,
      });
    } catch (error) {
      console.error('❌ Failed to emit member role updated event:', error);
    }
  }

  /**
   * Emit project created event to team members
   */
  static emitProjectCreated(payload: ProjectCreatedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.PROJECT_CREATED, payload);
      console.log(`📤 Emitted ${SocketEvents.PROJECT_CREATED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit project created event:', error);
    }
  }

  /**
   * Emit project updated event to team members
   */
  static emitProjectUpdated(payload: ProjectUpdatedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.PROJECT_UPDATED, payload);
      console.log(`📤 Emitted ${SocketEvents.PROJECT_UPDATED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit project updated event:', error);
    }
  }

  /**
   * Emit project deleted event to team members
   */
  static emitProjectDeleted(payload: ProjectDeletedPayload): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      const roomName = `team:${payload.teamId}`;
      
      io.to(roomName).emit(SocketEvents.PROJECT_DELETED, payload);
      console.log(`📤 Emitted ${SocketEvents.PROJECT_DELETED} to ${roomName}`);
    } catch (error) {
      console.error('❌ Failed to emit project deleted event:', error);
    }
  }

  /**
   * Emit custom event to specific room
   */
  static emitToRoom(room: string, event: string, data: any): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      io.to(room).emit(event, data);
      console.log(`📤 Emitted ${event} to ${room}`);
    } catch (error) {
      console.error(`❌ Failed to emit ${event} to ${room}:`, error);
    }
  }

  /**
   * Emit event to specific user
   */
  static emitToUser(userId: string, event: string, data: any): void {
    try {
      if (!isSocketInitialized()) {
        console.log('⚠️  Socket.IO not initialized, skipping event emission');
        return;
      }

      const io = getIO();
      io.to(`user:${userId}`).emit(event, data);
      console.log(`📤 Emitted ${event} to user:${userId}`);
    } catch (error) {
      console.error(`❌ Failed to emit ${event} to user:${userId}:`, error);
    }
  }
}
