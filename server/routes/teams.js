import express from 'express';
import { z } from 'zod';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import { rateLimitMiddleware } from '../lib/middleware/rate-limit.middleware';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { TeamService } from '../lib/services/team.service';
import {
  TeamRole,
  ResourceType,





} from '../../shared/api';


const router = express.Router();
const prisma = new PrismaClient();

const teamService = new TeamService(prisma);

// Apply authentication to all team routes
router.use(authMiddleware);

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(TeamRole).default(TeamRole.MEMBER),
  permissions: z.record(z.any()).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(TeamRole),
  permissions: z.record(z.any()).optional(),
});

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const shareResourceSchema = z.object({
  workspaceId: z.string().optional(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string(),
  permissions: z.record(z.any()),
});

const acceptInvitationSchema = z.object({
  token: z.string(),
});

const activityQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const validation = createTeamSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const userId = req.user.id;
      const team = await teamService.createTeam(userId, validation.data );

      res.status(201).json({
        success: true,
        team
      });
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create team',
          code: 'TEAM_CREATION_FAILED'
        }
      });
    }
  }
);

/**
 * GET /api/teams
 * Get user's teams
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const teams = await teamService.getUserTeams(userId);

    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch teams',
        code: 'TEAMS_FETCH_FAILED'
      }
    });
  }
});

/**
 * GET /api/teams/:id
 * Get team details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const team = await teamService.getTeam(id, userId);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND_ERROR',
          message: 'Team not found',
          code: 'TEAM_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Error fetching team:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
          code: 'ACCESS_DENIED'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team',
        code: 'TEAM_FETCH_FAILED'
      }
    });
  }
});

/**
 * PUT /api/teams/:id
 * Update team details
 */
router.put('/:id',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const validation = updateTeamSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const team = await teamService.updateTeam(id, userId, validation.data);

      res.json({
        success: true,
        team
      });
    } catch (error) {
      console.error('Error updating team:', error);

      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update team',
          code: 'TEAM_UPDATE_FAILED'
        }
      });
    }
  }
);

/**
 * DELETE /api/teams/:id
 * Delete a team
 */
router.delete('/:id',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await teamService.deleteTeam(id, userId);

      res.json({
        success: true,
        message: 'Team deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting team:', error);

      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete team',
          code: 'TEAM_DELETE_FAILED'
        }
      });
    }
  }
);

/**
 * POST /api/teams/:id/invite
 * Invite a member to the team
 */
router.post('/:id/invite',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const validation = inviteMemberSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const invitation = await teamService.inviteTeamMember(id, userId, validation.data );

      res.status(201).json({
        success: true,
        invitation
      });
    } catch (error) {
      console.error('Error inviting member:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('already a member') || error.message.includes('already sent')) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: error.message,
              code: 'DUPLICATE_INVITATION'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to invite member',
          code: 'INVITATION_FAILED'
        }
      });
    }
  }
);

/**
 * POST /api/teams/accept-invitation
 * Accept a team invitation
 */
router.post('/accept-invitation',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const validation = acceptInvitationSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const result = await teamService.acceptInvitation(validation.data.token, userId);

      res.json({
        success: true,
        teamMember: result.teamMember,
        team: result.team
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid invitation') ||
          error.message.includes('expired') ||
          error.message.includes('processed')) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: error.message,
              code: 'INVALID_INVITATION'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to accept invitation',
          code: 'INVITATION_ACCEPT_FAILED'
        }
      });
    }
  }
);

/**
 * PUT /api/teams/:id/members/:memberId
 * Update member role and permissions
 */
router.put('/:id/members/:memberId',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id: teamId, memberId } = req.params;
      const userId = req.user.id;
      const validation = updateMemberRoleSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const member = await teamService.updateMemberRole(teamId, memberId, userId, validation.data );

      res.json({
        success: true,
        member
      });
    } catch (error) {
      console.error('Error updating member role:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied') ||
          error.message.includes('Cannot change')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'MEMBER_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update member role',
          code: 'MEMBER_UPDATE_FAILED'
        }
      });
    }
  }
);

/**
 * DELETE /api/teams/:id/members/:memberId
 * Remove a member from the team
 */
router.delete('/:id/members/:memberId',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id: teamId, memberId } = req.params;
      const userId = req.user.id;

      await teamService.removeMember(teamId, memberId, userId);

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      console.error('Error removing member:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied') ||
          error.message.includes('Cannot remove')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'MEMBER_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove member',
          code: 'MEMBER_REMOVE_FAILED'
        }
      });
    }
  }
);

/**
 * GET /api/teams/:id/workspaces
 * Get team workspaces
 */
router.get('/:id/workspaces', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const userId = req.user.id;

    const workspaces = await teamService.getTeamWorkspaces(teamId, userId);

    res.json({
      success: true,
      workspaces
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);

    if (error instanceof Error && error.message.includes('not a member')) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
          code: 'ACCESS_DENIED'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch workspaces',
        code: 'WORKSPACES_FETCH_FAILED'
      }
    });
  }
});

/**
 * POST /api/teams/:id/workspaces
 * Create a new workspace in the team
 */
router.post('/:id/workspaces',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const userId = req.user.id;
      const validation = createWorkspaceSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const workspace = await teamService.createWorkspace(teamId, userId, validation.data );

      res.status(201).json({
        success: true,
        workspace
      });
    } catch (error) {
      console.error('Error creating workspace:', error);

      if (error instanceof Error && error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: error.message,
            code: 'ACCESS_DENIED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create workspace',
          code: 'WORKSPACE_CREATE_FAILED'
        }
      });
    }
  }
);

/**
 * PUT /api/teams/workspaces/:workspaceId
 * Update workspace details
 */
router.put('/workspaces/:workspaceId',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;
      const validation = createWorkspaceSchema.partial().safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const workspace = await teamService.updateWorkspace(workspaceId, userId, validation.data );

      res.json({
        success: true,
        workspace
      });
    } catch (error) {
      console.error('Error updating workspace:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'WORKSPACE_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update workspace',
          code: 'WORKSPACE_UPDATE_FAILED'
        }
      });
    }
  }
);

/**
 * DELETE /api/teams/workspaces/:workspaceId
 * Delete a workspace
 */
router.delete('/workspaces/:workspaceId',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      await teamService.deleteWorkspace(workspaceId, userId);

      res.json({
        success: true,
        message: 'Workspace deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting workspace:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'WORKSPACE_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete workspace',
          code: 'WORKSPACE_DELETE_FAILED'
        }
      });
    }
  }
);

/**
 * POST /api/teams/:id/resources
 * Share a resource with the team
 */
router.post('/:id/resources',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id: teamId } = req.params;
      const userId = req.user.id;
      const validation = shareResourceSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            code: 'VALIDATION_FAILED',
            details: validation.error.errors
          }
        });
      }

      const resourceShare = await teamService.shareResource(teamId, userId, validation.data );

      res.status(201).json({
        success: true,
        resourceShare
      });
    } catch (error) {
      console.error('Error sharing resource:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found') || error.message.includes('does not belong')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'RESOURCE_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to share resource',
          code: 'RESOURCE_SHARE_FAILED'
        }
      });
    }
  }
);

/**
 * GET /api/teams/:id/resources
 * Get team shared resources
 */
router.get('/:id/resources', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { workspaceId } = req.query;
    const userId = req.user.id;

    const resources = await teamService.getTeamResources(
      teamId,
      userId,
      workspaceId 
    );

    res.json({
      success: true,
      resources
    });
  } catch (error) {
    console.error('Error fetching team resources:', error);

    if (error instanceof Error && error.message.includes('not a member')) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
          code: 'ACCESS_DENIED'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team resources',
        code: 'RESOURCES_FETCH_FAILED'
      }
    });
  }
});

/**
 * DELETE /api/teams/:id/resources/:resourceType/:resourceId
 * Unshare a resource from the team
 */
router.delete('/:id/resources/:resourceType/:resourceId',
  rateLimitMiddleware({ action: 'ai_request' }),
  async (req, res) => {
    try {
      const { id: teamId, resourceType, resourceId } = req.params;
      const userId = req.user.id;

      // Validate resourceType
      if (!Object.values(ResourceType).includes(resourceType )) {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid resource type',
            code: 'INVALID_RESOURCE_TYPE'
          }
        });
      }

      await teamService.unshareResource(teamId, resourceType , resourceId, userId);

      res.json({
        success: true,
        message: 'Resource unshared successfully'
      });
    } catch (error) {
      console.error('Error unsharing resource:', error);

      if (error instanceof Error) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({
            success: false,
            error: {
              type: 'AUTHORIZATION_ERROR',
              message: error.message,
              code: 'ACCESS_DENIED'
            }
          });
        }

        if (error.message.includes('not found')) {
          return res.status(404).json({
            success: false,
            error: {
              type: 'NOT_FOUND_ERROR',
              message: error.message,
              code: 'RESOURCE_SHARE_NOT_FOUND'
            }
          });
        }
      }

      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unshare resource',
          code: 'RESOURCE_UNSHARE_FAILED'
        }
      });
    }
  }
);

/**
 * GET /api/teams/:id/activity
 * Get team activity feed
 */
router.get('/:id/activity', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const userId = req.user.id;
    const validation = activityQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          code: 'VALIDATION_FAILED',
          details: validation.error.errors
        }
      });
    }

    const { page, limit } = validation.data;
    const result = await teamService.getTeamActivity(teamId, userId, page, limit);

    res.json({
      success: true,
      activities: result.activities,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching team activity:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
          code: 'ACCESS_DENIED'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch team activity',
        code: 'ACTIVITY_FETCH_FAILED'
      }
    });
  }
});

export default router; 