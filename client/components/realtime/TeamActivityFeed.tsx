import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Users, 
  Bot, 
  Shield, 
  Rocket, 
  CreditCard,
  Settings,
  RefreshCw,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { useTeamActivity, TeamActivity } from '@/hooks/use-team-activity';
import { formatDistanceToNow } from 'date-fns';

interface TeamActivityFeedProps {
  teamId?: string;
  title?: string;
  maxHeight?: string;
  showFilters?: boolean;
  limit?: number;
  className?: string;
}

export function TeamActivityFeed({
  teamId,
  title = 'Team Activity',
  maxHeight = 'h-96',
  showFilters = true,
  limit = 50,
  className
}: TeamActivityFeedProps) {
  const { activities, isConnected } = useTeamActivity({
    teamId,
    limit
  });

  const [filterResource, setFilterResource] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  const getActivityIcon = (activity: TeamActivity) => {
    switch (activity.resource) {
      case 'ai_request':
        return <Bot className="h-4 w-4 text-blue-500" />;
      case 'deployment':
        return <Rocket className="h-4 w-4 text-green-500" />;
      case 'security_scan':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'team':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'settings':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (activity: TeamActivity) => {
    switch (activity.action) {
      case 'created':
      case 'completed':
        return 'text-green-600';
      case 'failed':
      case 'deleted':
        return 'text-red-600';
      case 'updated':
      case 'modified':
        return 'text-blue-600';
      case 'started':
      case 'initiated':
        return 'text-yellow-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatActivityMessage = (activity: TeamActivity) => {
    const action = activity.action.replace('_', ' ');
    const resource = activity.resource.replace('_', ' ');
    
    return activity.message || `${action} ${resource}`;
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredActivities = activities.filter(activity => {
    if (filterResource !== 'all' && activity.resource !== filterResource) {
      return false;
    }
    if (filterUser !== 'all' && activity.userId !== filterUser) {
      return false;
    }
    return true;
  });

  const uniqueResources = Array.from(new Set(activities.map(a => a.resource)));
  const uniqueUsers = Array.from(new Set(activities.map(a => ({ id: a.userId, name: a.userName, email: a.userEmail }))));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-base">{title}</CardTitle>
            {!isConnected && (
              <Badge variant="outline" className="text-xs">
                Offline
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {showFilters && (
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <CardDescription>
          {filteredActivities.length} recent activities
          {teamId && ' for this team'}
        </CardDescription>
        
        {showFilters && (
          <div className="flex space-x-2 pt-2">
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="all">All Resources</option>
              {uniqueResources.map(resource => (
                <option key={resource} value={resource}>
                  {resource.replace('_', ' ')}
                </option>
              ))}
            </select>
            
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className={maxHeight}>
          <div className="p-4 space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://avatar.vercel.sh/${activity.userEmail}`} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(activity.userName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {activity.userName}
                      </span>
                      <Badge variant="outline" className="text-xs flex items-center space-x-1">
                        {getActivityIcon(activity)}
                        <span>{activity.resource.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    
                    <p className={`text-sm ${getActivityColor(activity)} mb-1`}>
                      {formatActivityMessage(activity)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                      
                      {activity.metadata?.resourceName && (
                        <span className="text-xs text-muted-foreground truncate max-w-32">
                          {activity.metadata.resourceName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}