import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  FolderPlus,
  MoreHorizontal,
  Mail,
  Settings,
  Trash2,
  Edit,
  Clock,
  Activity,
  MessageSquare,
  Code,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useQuery } from '@tanstack/react-query';
import { teamApi } from '@/lib/api/teams.api';
import { useTeamWebSocket } from '@/hooks/useTeamWebSocket';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatar?: string;
  status: 'active' | 'away' | 'offline';
  lastActive: string;
  contributions: number;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  projects: number;
  activity: number;
  createdAt: string;
}

export default function TeamsPage() {
  const { user, token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teamsData, isLoading: loading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.getTeams(token as string),
    enabled: !!token
  });

  const teams: Team[] = teamsData?.teams || [];

  const firstTeamId = teams.length > 0 ? teams[0].id : undefined;

  // Use the WebSocket for real-time updates for the first team
  const { activeUsers } = useTeamWebSocket(firstTeamId);

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['team-activity', firstTeamId],
    queryFn: () => teamApi.getTeamActivity(token as string, firstTeamId!),
    enabled: !!token && !!firstTeamId
  });

  const teamActivity = activityData?.activities || [];

  const pendingInvitations = [
    { id: 1, email: 'john.doe@example.com', team: 'Engineering Team', role: 'MEMBER', sentAt: '2 days ago' },
    { id: 2, email: 'jane.smith@example.com', team: 'DevOps Team', role: 'ADMIN', sentAt: '1 day ago' },
    { id: 3, email: 'bob.johnson@example.com', team: 'Security Team', role: 'VIEWER', sentAt: '3 hours ago' },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'ADMIN': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'MEMBER': return <User className="w-4 h-4 text-green-500" />;
      case 'VIEWER': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string, userId: string) => {
    if (activeUsers.has(userId)) return 'bg-green-500';
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deployment': return <Code className="w-4 h-4 text-blue-500" />;
      case 'code': return <GitBranch className="w-4 h-4 text-purple-500" />;
      case 'security': return <Shield className="w-4 h-4 text-red-500" />;
      case 'ai': return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'devops': return <Settings className="w-4 h-4 text-orange-500" />;
      case 'docs': return <MessageSquare className="w-4 h-4 text-gray-500" />;
      case 'RESOURCE_SHARE': return <FolderPlus className="w-4 h-4 text-blue-500" />;
      case 'MEMBER_JOINED': return <UserPlus className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const totalMembers = teams.reduce((acc, team) => acc + (team.members?.length || 0), 0);
  const activeMembers = activeUsers.size || teams.reduce((acc, team) =>
    acc + (team.members?.filter(m => m.status === 'active')?.length || 0), 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading teams...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teams & Collaboration</h1>
            <p className="text-muted-foreground">
              Manage your teams, invite members, and track collaboration activity
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teams.length}</p>
                  <p className="text-sm text-muted-foreground">Teams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <User className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeMembers}</p>
                  <p className="text-sm text-muted-foreground">Active Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Mail className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="members">All Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {teams.map((team) => (
                <Card key={team.id} className="hover:border-primary/50 transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription>{team.description}</CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{team.members?.length || 0} members</span>
                      <span className="text-muted-foreground">{team.projects || 0} projects</span>
                      <span className="text-muted-foreground">{team.activity || 0} activities</span>
                    </div>

                    {/* Member Avatars */}
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {team.members?.slice(0, 5).map((member) => (
                          <div key={member.id} className="relative">
                            <Avatar className="w-8 h-8 border-2 border-background">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(member.status, member.id)}`} />
                          </div>
                        ))}
                        {(team.members?.length || 0) > 5 && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                            +{(team.members?.length || 0) - 5}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        Settings
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <FolderPlus className="w-4 h-4 mr-1" />
                        New Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* All Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Team Members</CardTitle>
                <CardDescription>View and manage all members across your teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.flatMap(team => team.members || []).map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status, member.id)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {getRoleIcon(member.role)}
                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{member.contributions || 0} contributions</p>
                        <p className="text-xs text-muted-foreground">Last active: {member.lastActive || 'Unknown'}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Activity Feed</CardTitle>
                <CardDescription>Recent actions and updates from {teams.length > 0 ? teams[0].name : 'your team'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamActivity.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent activity.</p>
                  ) : teamActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                      <div className="p-2 bg-muted rounded-full">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">{activity.user?.name || 'Unknown User'}</span>
                          {' '}{activity.description}{' '}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{activity.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Manage outstanding team invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        <Mail className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited to <span className="font-medium">{invitation.team}</span> as {invitation.role}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Sent {invitation.sentAt}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Resend
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}