import { Response } from 'express';
import Team from '../../../models/team.model';
import User from '../../../models/user.model';
import { ResponseHandler } from '../../../responses';
import { ResponseMessages } from '../../../response-messages';
import { AuthRequest } from '../../../interfaces';
import { TeamMemberRole } from '../../../interfaces/team.interface';
import { CreateTeamDto, UpdateTeamDto, InviteMemberDto, UpdateMemberRoleDto } from '../dtos';
import { sendTeamMemberAddedEmail } from '../../../services/email.service';
import { SocketService } from '../../../services/socket.service';
import { config } from '../../../environments';

export class TeamController {
  /**
   * Create a new team
   */
  static async createTeam(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, description }: CreateTeamDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Create team with owner
      const team = new Team({
        name,
        description,
        owner: userId,
        members: [
          {
            userId,
            role: TeamMemberRole.OWNER,
            joinedAt: new Date(),
          },
        ],
      });

      await team.save();

      // Populate owner details
      await team.populate('owner', 'name email');

      return ResponseHandler.success(
        res,
        'Team created successfully',
        {
          id: (team as any)._id.toString(),
          name: team.name,
          description: team.description,
          owner: {
            id: (team.owner as any)._id.toString(),
            name: (team.owner as any).name,
            email: (team.owner as any).email,
          },
          memberCount: team.members.length,
          createdAt: team.createdAt,
        },
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
   * Get all teams for authenticated user
   */
  static async getMyTeams(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Find teams where user is owner or member
      const teams = await Team.find({
        $or: [
          { owner: userId },
          { 'members.userId': userId },
        ],
      })
        .populate('owner', 'name email')
        .populate('members.userId', 'name email')
        .sort({ createdAt: -1 });

      const teamsResponse = teams.map((team) => {
        // Format members with details
        const membersFormatted = team.members.map((member: any) => ({
          userId: (member.userId as any)._id.toString(),
          name: member.userId.name,
          email: member.userId.email,
          role: member.role,
          joinedAt: member.joinedAt,
        }));

        return {
          id: (team as any)._id.toString(),
          name: team.name,
          description: team.description,
          owner: {
            id: (team.owner as any)._id.toString(),
            name: (team.owner as any).name,
            email: (team.owner as any).email,
          },
          members: membersFormatted,
          memberCount: team.members.length,
          userRole: team.getMemberRole(userId),
          createdAt: team.createdAt,
        };
      });

      return ResponseHandler.success(
        res,
        'Teams fetched successfully',
        {
          teams: teamsResponse,
          count: teamsResponse.length,
        }
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
   * Get team by ID with members
   */
  static async getTeamById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Check if user is member BEFORE populating
      if (!team.isMember(userId)) {
        return ResponseHandler.error(
          res,
          'You are not a member of this team',
          'Forbidden',
          403
        );
      }

      // Now populate after the membership check
      await team.populate('owner', 'name email');
      await team.populate('members.userId', 'name email');

      const membersResponse = team.members.map((member: any) => ({
        userId: (member.userId as any)._id.toString(),
        name: member.userId.name,
        email: member.userId.email,
        role: member.role,
        joinedAt: member.joinedAt,
      }));

      return ResponseHandler.success(
        res,
        'Team fetched successfully',
        {
          id: (team as any)._id.toString(),
          name: team.name,
          description: team.description,
          owner: {
            id: (team.owner as any)._id.toString(),
            name: (team.owner as any).name,
            email: (team.owner as any).email,
          },
          members: membersResponse,
          memberCount: team.members.length,
          userRole: team.getMemberRole(userId),
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
        }
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
   * Update team details
   */
  static async updateTeam(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const { name, description }: UpdateTeamDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Check if user is admin or owner
      if (!team.isAdminOrOwner(userId)) {
        return ResponseHandler.error(
          res,
          'Only team admins or owners can update team details',
          'Forbidden',
          403
        );
      }

      // Update fields
      console.log('🔍 DEBUG - Before update:', { currentName: team.name, newName: name });
      if (name !== undefined) team.name = name;
      if (description !== undefined) team.description = description;
      
      console.log('🔍 DEBUG - After assignment:', { teamName: team.name });
      await team.save();
      console.log('🔍 DEBUG - After save:', { teamName: team.name });
      
      await team.populate('owner', 'name email');

      return ResponseHandler.success(
        res,
        'Team updated successfully',
        {
          id: (team as any)._id.toString(),
          name: team.name,
          description: team.description,
          owner: {
            id: (team.owner as any)._id.toString(),
            name: (team.owner as any).name,
            email: (team.owner as any).email,
          },
          updatedAt: team.updatedAt,
        }
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
   * Delete team
   */
  static async deleteTeam(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Only owner can delete team
      if (team.owner.toString() !== userId) {
        return ResponseHandler.error(
          res,
          'Only team owner can delete the team',
          'Forbidden',
          403
        );
      }

      await Team.findByIdAndDelete(teamId);

      return ResponseHandler.success(
        res,
        'Team deleted successfully',
        null
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
   * Invite/Add member to team
   */
  static async inviteMember(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const { email, role }: InviteMemberDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Check if user is admin or owner
      if (!team.isAdminOrOwner(userId)) {
        return ResponseHandler.error(
          res,
          'Only team admins or owners can invite members',
          'Forbidden',
          403
        );
      }

      // Find user by email
      const userToInvite = await User.findOne({ email });

      if (!userToInvite) {
        return ResponseHandler.notFound(res, 'User not found with this email');
      }

      // Check if user is already a member
      if (team.isMember((userToInvite as any)._id.toString())) {
        return ResponseHandler.error(
          res,
          'User is already a member of this team',
          'Conflict',
          409
        );
      }

      // Get inviter's details for email notification
      const inviter = await User.findById(userId);
      if (!inviter) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      // Add member
      team.members.push({
        userId: (userToInvite as any)._id.toString(),
        role: role || TeamMemberRole.MEMBER,
        joinedAt: new Date(),
      } as any);

      await team.save();

      // Generate team view link
      const teamViewLink = `${config.cors.origin}/teams/${(team as any)._id.toString()}`;

      // Send email notification (non-blocking)
      sendTeamMemberAddedEmail(
        userToInvite.email,
        userToInvite.name,
        team.name,
        inviter.name,
        teamViewLink,
        role || TeamMemberRole.MEMBER
      )
        .then(() => console.log(`✅ Team member notification email sent to ${userToInvite.email}`))
        .catch((err) => console.error(`❌ Failed to send team member notification email:`, err));

      // Emit Socket.IO event for member joined
      SocketService.emitMemberJoined({
        teamId: (team as any)._id.toString(),
        teamName: team.name,
        member: {
          id: (userToInvite as any)._id.toString(),
          name: userToInvite.name,
          email: userToInvite.email,
          role: role || TeamMemberRole.MEMBER,
          joinedAt: new Date(),
        },
        addedBy: {
          id: userId,
          name: inviter.name,
          email: inviter.email,
        },
      });

      return ResponseHandler.success(
        res,
        'Member added to team successfully',
        {
          teamId: (team as any)._id.toString(),
          member: {
            userId: (userToInvite as any)._id.toString(),
            name: userToInvite.name,
            email: userToInvite.email,
            role: role || TeamMemberRole.MEMBER,
          },
        },
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
   * Remove member from team
   */
  static async removeMember(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId, memberId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Check if user is admin or owner
      if (!team.isAdminOrOwner(userId)) {
        return ResponseHandler.error(
          res,
          'Only team admins or owners can remove members',
          'Forbidden',
          403
        );
      }

      // Cannot remove owner
      if (team.owner.toString() === memberId) {
        return ResponseHandler.error(
          res,
          'Cannot remove team owner',
          'Bad Request',
          400
        );
      }

      // Find member before removing
      const memberIndex = team.members.findIndex(
        (m: any) => m.userId.toString() === memberId
      );

      if (memberIndex === -1) {
        return ResponseHandler.notFound(res, 'Member not found in this team');
      }

      // Get member info before removal
      const removedMember = await User.findById(memberId).select('name email');
      const remover = await User.findById(userId).select('name email');

      // Remove member
      team.members.splice(memberIndex, 1);
      await team.save();

      // Emit Socket.IO event for member removed
      if (removedMember && remover) {
        SocketService.emitMemberRemoved({
          teamId: (team as any)._id.toString(),
          teamName: team.name,
          memberId,
          memberName: removedMember.name,
          removedBy: {
            id: userId,
            name: remover.name,
            email: remover.email,
          },
        });
      }

      return ResponseHandler.success(
        res,
        'Member removed from team successfully',
        null
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
   * Update member role
   */
  static async updateMemberRole(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId, memberId } = req.params;
      const { role }: UpdateMemberRoleDto = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Only owner can update roles
      if (team.owner.toString() !== userId) {
        return ResponseHandler.error(
          res,
          'Only team owner can update member roles',
          'Forbidden',
          403
        );
      }

      // Cannot update owner's role
      if (team.owner.toString() === memberId) {
        return ResponseHandler.error(
          res,
          'Cannot update team owner role',
          'Bad Request',
          400
        );
      }

      // Find and update member
      const member = team.members.find(
        (m: any) => m.userId.toString() === memberId
      );

      if (!member) {
        return ResponseHandler.notFound(res, 'Member not found in this team');
      }

      // Store old role
      const oldRole = (member as any).role;

      // Get member and updater info
      const memberUser = await User.findById(memberId).select('name email');
      const updater = await User.findById(userId).select('name email');

      // Update role
      (member as any).role = role;
      await team.save();

      // Emit Socket.IO event for role update
      if (memberUser && updater) {
        SocketService.emitMemberRoleUpdated({
          teamId: (team as any)._id.toString(),
          teamName: team.name,
          member: {
            id: memberId,
            name: memberUser.name,
            email: memberUser.email,
          },
          oldRole,
          newRole: role,
          updatedBy: {
            id: userId,
            name: updater.name,
            email: updater.email,
          },
        });
      }

      return ResponseHandler.success(
        res,
        'Member role updated successfully',
        {
          teamId: (team as any)._id.toString(),
          memberId,
          newRole: role,
        }
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
   * Leave team
   */
  static async leaveTeam(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseHandler.unauthorized(res, ResponseMessages.AUTH.UNAUTHORIZED);
      }

      const team = await Team.findById(teamId);

      if (!team) {
        return ResponseHandler.notFound(res, 'Team not found');
      }

      // Owner cannot leave, must delete team or transfer ownership
      if (team.owner.toString() === userId) {
        return ResponseHandler.error(
          res,
          'Team owner cannot leave. Please transfer ownership or delete the team.',
          'Bad Request',
          400
        );
      }

      // Remove user from members
      const memberIndex = team.members.findIndex(
        (m: any) => m.userId.toString() === userId
      );

      if (memberIndex === -1) {
        return ResponseHandler.error(
          res,
          'You are not a member of this team',
          'Bad Request',
          400
        );
      }

      team.members.splice(memberIndex, 1);
      await team.save();

      return ResponseHandler.success(
        res,
        'Left team successfully',
        null
      );
    } catch (error: any) {
      return ResponseHandler.serverError(
        res,
        ResponseMessages.GENERAL.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }
}

