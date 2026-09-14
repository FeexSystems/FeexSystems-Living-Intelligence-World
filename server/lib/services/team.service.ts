import { PrismaClient } from '@prisma/client';
import { TeamRole, MemberStatus, InvitationStatus, ResourceType } from '../../../shared/api.js';

import {
  Team,
  TeamMember,
  TeamInvitation,
  Workspace,
  ResourceShare,
  TeamActivityLog,
  CreateTeamRequest,
  InviteTeamMemberRequest,
  UpdateMemberRoleRequest,
  CreateWorkspaceRequest,
  ShareResourceRequest,
  getTeamPermissions,
  getDefaultResourcePermissions
} from '../../../shared/api.js';
import { generateSecureToken } from '../utils/crypto.js';
import { sendTeamInvitationEmail } from '../utils/email.js';
import { ActivityLogService } from './activity-log.service.js';

export class TeamService {
  constructor(private prisma: PrismaClient) { }

  // Team Management
  async createTeam(userId: string, data: CreateTeamRequest): Promise<Team> {
    const team = await this.prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
        settings: data.settings || {},
        members: {
          create: {
            userId,
            role: TeamRole.OWNER,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date()
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        },
        workspaces: true,
        _count: {
          select: { members: true }
        }
      }
    });

    // Log team creation activity
    await this.logActivity({
      userId,
      action: 'team.created',
      resource: 'team',
      resourceId: team.id,
      metadata: { teamName: team.name }
    });

    return this.formatTeam(team);
  }

  async getTeam(teamId: string, userId: string): Promise<Team | null> {
    // Verify user is a member of the team
    const membership = await this.verifyTeamMembership(teamId, userId);
    if (!membership) {
      throw new Error('Access denied: User is not a member of this team');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        },
        workspaces: true,
        _count: {
          select: { members: true }
        }
      }
    });

    return team ? this.formatTeam(team) : null;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            status: MemberStatus.ACTIVE
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        },
        workspaces: true,
        _count: {
          select: { members: true }
        }
      }
    });

    return teams.map(team => this.formatTeam(team));
  }

  async updateTeam(teamId: string, userId: string, data: Partial<CreateTeamRequest>): Promise<Team> {
    // Verify user has permission to manage team
    await this.verifyTeamPermission(teamId, userId, 'canManageTeam');

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.settings && { settings: data.settings }),
        updatedAt: new Date()
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        },
        workspaces: true,
        _count: {
          select: { members: true }
        }
      }
    });

    // Log team update activity
    await this.logActivity({
      userId,
      action: 'team.updated',
      resource: 'team',
      resourceId: teamId,
      metadata: { changes: data }
    });

    return this.formatTeam(team);
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    // Verify user is the team owner
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true, name: true }
    });

    if (!team || team.ownerId !== userId) {
      throw new Error('Access denied: Only team owner can delete the team');
    }

    await this.prisma.team.delete({
      where: { id: teamId }
    });

    // Log team deletion activity
    await this.logActivity({
      userId,
      action: 'team.deleted',
      resource: 'team',
      resourceId: teamId,
      metadata: { teamName: team.name }
    });
  }

  // Team Member Management
  async inviteTeamMember(teamId: string, userId: string, data: InviteTeamMemberRequest): Promise<TeamInvitation> {
    // Verify user has permission to invite members
    await this.verifyTeamPermission(teamId, userId, 'canInviteMembers');

    // Check if user is already a member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: await this.getUserIdByEmail(data.email)
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.teamInvitation.findUnique({
      where: {
        teamId_email: {
          teamId,
          email: data.email
        }
      }
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new Error('Invitation already sent to this email');
    }

    // Create invitation
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.teamInvitation.create({
      data: {
        teamId,
        email: data.email,
        role: data.role,
        permissions: data.permissions,
        token,
        invitedBy: userId,
        expiresAt,
        status: InvitationStatus.PENDING
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Send invitation email
    await sendTeamInvitationEmail(data.email, invitation.team!.name, token);

    // Log invitation activity
    await this.logActivity({
      userId,
      action: 'team.member_invited',
      resource: 'team',
      resourceId: teamId,
      metadata: {
        invitedEmail: data.email,
        role: data.role
      }
    });

    return this.formatTeamInvitation(invitation);
  }

  async acceptInvitation(token: string, userId: string): Promise<{ teamMember: TeamMember; team: Team }> {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    profileImageUrl: true
                  }
                }
              }
            },
            workspaces: true,
            _count: {
              select: { members: true }
            }
          }
        }
      }
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation has already been processed');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Get user email to verify
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user || user.email !== invitation.email) {
      throw new Error('Invitation email does not match user email');
    }

    // Create team member and update invitation
    const [teamMember] = await this.prisma.$transaction([
      this.prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
          permissions: invitation.permissions as any,
          status: MemberStatus.ACTIVE,
          invitedBy: invitation.invitedBy,
          joinedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true
            }
          }
        }
      }),
      this.prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      })
    ]);

    // Log acceptance activity
    await this.logActivity({
      userId,
      action: 'team.invitation_accepted',
      resource: 'team',
      resourceId: invitation.teamId,
      metadata: {
        role: invitation.role
      }
    });

    return {
      teamMember: this.formatTeamMember(teamMember),
      team: this.formatTeam(invitation.team)
    };
  }

  async updateMemberRole(teamId: string, memberId: string, userId: string, data: UpdateMemberRoleRequest): Promise<TeamMember> {
    // Verify user has permission to manage members
    await this.verifyTeamPermission(teamId, userId, 'canRemoveMembers');

    // Cannot change owner role
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { role: true, userId: true }
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    if (member.role === TeamRole.OWNER) {
      throw new Error('Cannot change owner role');
    }

    // Cannot change your own role (except owner can)
    const userMembership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: { role: true }
    });

    if (member.userId === userId && userMembership?.role !== TeamRole.OWNER) {
      throw new Error('Cannot change your own role');
    }

    const updatedMember = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        role: data.role,
        permissions: data.permissions
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      }
    });

    // Log role update activity
    await this.logActivity({
      userId,
      action: 'team.member_role_updated',
      resource: 'team',
      resourceId: teamId,
      metadata: {
        memberId,
        newRole: data.role,
        previousRole: member.role
      }
    });

    return this.formatTeamMember(updatedMember);
  }

  async removeMember(teamId: string, memberId: string, userId: string): Promise<void> {
    // Verify user has permission to remove members
    await this.verifyTeamPermission(teamId, userId, 'canRemoveMembers');

    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { role: true, userId: true }
    });

    if (!member) {
      throw new Error('Team member not found');
    }

    // Cannot remove owner
    if (member.role === TeamRole.OWNER) {
      throw new Error('Cannot remove team owner');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId }
    });

    // Log member removal activity
    await this.logActivity({
      userId,
      action: 'team.member_removed',
      resource: 'team',
      resourceId: teamId,
      metadata: {
        removedMemberId: member.userId
      }
    });
  }

  // Workspace Management
  async createWorkspace(teamId: string, userId: string, data: CreateWorkspaceRequest): Promise<Workspace> {
    // Verify user has permission to manage workspaces
    await this.verifyTeamPermission(teamId, userId, 'canManageWorkspaces');

    const workspace = await this.prisma.workspace.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
        settings: data.settings || {},
        createdBy: userId
      }
    });

    // Log workspace creation activity
    await this.logActivity({
      userId,
      action: 'workspace.created',
      resource: 'workspace',
      resourceId: workspace.id,
      metadata: {
        workspaceName: workspace.name,
        teamId
      }
    });

    return this.formatWorkspace(workspace);
  }

  async getTeamWorkspaces(teamId: string, userId: string): Promise<Workspace[]> {
    // Verify user is a team member
    await this.verifyTeamMembership(teamId, userId);

    const workspaces = await this.prisma.workspace.findMany({
      where: {
        teamId,
        isActive: true
      },
      include: {
        _count: {
          select: { resourceShares: true }
        }
      }
    });

    return workspaces.map(workspace => ({
      ...this.formatWorkspace(workspace),
      resourceCount: workspace._count.resourceShares
    }));
  }

  async updateWorkspace(workspaceId: string, userId: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { teamId: true }
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Verify user has permission to manage workspaces
    await this.verifyTeamPermission(workspace.teamId, userId, 'canManageWorkspaces');

    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.settings && { settings: data.settings }),
        updatedAt: new Date()
      }
    });

    // Log workspace update activity
    await this.logActivity({
      userId,
      action: 'workspace.updated',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        changes: data,
        teamId: workspace.teamId
      }
    });

    return this.formatWorkspace(updatedWorkspace);
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { teamId: true, name: true }
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Verify user has permission to manage workspaces
    await this.verifyTeamPermission(workspace.teamId, userId, 'canManageWorkspaces');

    await this.prisma.workspace.delete({
      where: { id: workspaceId }
    });

    // Log workspace deletion activity
    await this.logActivity({
      userId,
      action: 'workspace.deleted',
      resource: 'workspace',
      resourceId: workspaceId,
      metadata: {
        workspaceName: workspace.name,
        teamId: workspace.teamId
      }
    });
  }

  // Resource Sharing
  async shareResource(teamId: string, userId: string, data: ShareResourceRequest): Promise<ResourceShare> {
    // Verify user has permission to share resources
    await this.verifyTeamPermission(teamId, userId, 'canShareResources');

    // Verify workspace belongs to team if specified
    if (data.workspaceId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: data.workspaceId },
        select: { teamId: true }
      });

      if (!workspace || workspace.teamId !== teamId) {
        throw new Error('Workspace not found or does not belong to team');
      }
    }

    // Check if resource is already shared
    const existingShare = await this.prisma.resourceShare.findUnique({
      where: {
        teamId_resourceType_resourceId: {
          teamId,
          resourceType: data.resourceType,
          resourceId: data.resourceId
        }
      }
    });

    if (existingShare) {
      // Update existing share
      const updatedShare = await this.prisma.resourceShare.update({
        where: { id: existingShare.id },
        data: {
          workspaceId: data.workspaceId,
          permissions: data.permissions,
          sharedBy: userId,
          updatedAt: new Date()
        }
      });

      return this.formatResourceShare(updatedShare);
    }

    // Create new resource share
    const resourceShare = await this.prisma.resourceShare.create({
      data: {
        teamId,
        workspaceId: data.workspaceId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        permissions: data.permissions,
        sharedBy: userId
      }
    });

    // Log resource sharing activity
    await this.logActivity({
      userId,
      action: 'resource.shared',
      resource: data.resourceType.toLowerCase(),
      resourceId: data.resourceId,
      metadata: {
        teamId,
        workspaceId: data.workspaceId,
        permissions: data.permissions
      }
    });

    return this.formatResourceShare(resourceShare);
  }

  async getTeamResources(teamId: string, userId: string, workspaceId?: string): Promise<ResourceShare[]> {
    // Verify user is a team member
    await this.verifyTeamMembership(teamId, userId);

    const resources = await this.prisma.resourceShare.findMany({
      where: {
        teamId,
        ...(workspaceId && { workspaceId })
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return resources.map(resource => this.formatResourceShare(resource));
  }

  async unshareResource(teamId: string, resourceType: ResourceType, resourceId: string, userId: string): Promise<void> {
    // Verify user has permission to share resources
    await this.verifyTeamPermission(teamId, userId, 'canShareResources');

    const resourceShare = await this.prisma.resourceShare.findUnique({
      where: {
        teamId_resourceType_resourceId: {
          teamId,
          resourceType,
          resourceId
        }
      }
    });

    if (!resourceShare) {
      throw new Error('Resource share not found');
    }

    await this.prisma.resourceShare.delete({
      where: { id: resourceShare.id }
    });

    // Log resource unsharing activity
    await this.logActivity({
      userId,
      action: 'resource.unshared',
      resource: resourceType.toLowerCase(),
      resourceId,
      metadata: {
        teamId
      }
    });
  }

  // Team Activity
  async getTeamActivity(teamId: string, userId: string, page = 1, limit = 50): Promise<{ activities: TeamActivityLog[]; total: number }> {
    // Verify user has permission to view activity
    await this.verifyTeamPermission(teamId, userId, 'canViewActivity');

    const [activities, total] = await Promise.all([
      this.prisma.teamActivityLog.findMany({
        where: { teamId },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.teamActivityLog.count({
        where: { teamId }
      })
    ]);

    // Get user details for activities
    const userIds = [...new Set(activities.map(a => a.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedActivities = activities.map(activity => ({
      ...activity,
      user: userMap.get(activity.userId)
    }));

    return {
      activities: formattedActivities as any,
      total
    };
  }

  // Permission and Validation Helpers
  private async verifyTeamMembership(teamId: string, userId: string): Promise<TeamMember | null> {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: {
        id: true,
        role: true,
        status: true,
        permissions: true
      }
    });

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      return null;
    }

    return membership as any;
  }

  private async verifyTeamPermission(teamId: string, userId: string, permission: keyof ReturnType<typeof getTeamPermissions>): Promise<void> {
    const membership = await this.verifyTeamMembership(teamId, userId);

    if (!membership) {
      throw new Error('Access denied: User is not an active member of this team');
    }

    const permissions = getTeamPermissions(membership.role);

    if (!permissions[permission]) {
      throw new Error(`Access denied: User does not have permission to ${permission}`);
    }
  }

  private async getUserIdByEmail(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    return user?.id || '';
  }

  // Formatting Helpers
  private formatTeam(team: any): Team {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.ownerId,
      settings: team.settings,
      isActive: team.isActive,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members: team.members?.map((m: any) => this.formatTeamMember(m)),
      workspaces: team.workspaces?.map((w: any) => this.formatWorkspace(w)),
      memberCount: team._count?.members || team.members?.length || 0
    };
  }

  private formatTeamMember(member: any): TeamMember {
    return {
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      role: member.role,
      permissions: member.permissions,
      status: member.status,
      joinedAt: member.joinedAt,
      invitedBy: member.invitedBy,
      lastActiveAt: member.lastActiveAt,
      user: member.user
    };
  }

  private formatTeamInvitation(invitation: any): TeamInvitation {
    return {
      id: invitation.id,
      teamId: invitation.teamId,
      email: invitation.email,
      role: invitation.role,
      permissions: invitation.permissions,
      status: invitation.status,
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      team: invitation.team
    };
  }

  private formatWorkspace(workspace: any): Workspace {
    return {
      id: workspace.id,
      teamId: workspace.teamId,
      name: workspace.name,
      description: workspace.description,
      settings: workspace.settings,
      isActive: workspace.isActive,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    };
  }

  private formatResourceShare(share: any): ResourceShare {
    return {
      id: share.id,
      teamId: share.teamId,
      workspaceId: share.workspaceId,
      resourceType: share.resourceType,
      resourceId: share.resourceId,
      permissions: share.permissions,
      sharedBy: share.sharedBy,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt
    };
  }

  // Helper method for activity logging
  private async logActivity(entry: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activityLogService = new ActivityLogService(this.prisma);
    await activityLogService.logActivity(entry);
  }
}