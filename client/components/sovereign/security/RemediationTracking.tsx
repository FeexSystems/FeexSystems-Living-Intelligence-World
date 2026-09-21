import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MoreHorizontal, 
  Search, 
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  FileText,
  Edit
} from 'lucide-react';
import { Vulnerability, VulnerabilitySeverity } from '@/shared/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function RemediationTracking() {
  const { toast } = useToast();

  const { data: ticketsData, isLoading, isError } = useQuery({
    queryKey: ['remediation-tickets'],
    queryFn: async () => {
      const response = await fetch('/api/security/remediation/tickets');
      if (!response.ok) throw new Error('Failed to fetch remediation tickets');
      const res = await response.json();
      return res.data;
    }
  });

  const tasks: any[] = ticketsData?.tickets || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<VulnerabilitySeverity | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesSeverity = selectedSeverity === 'all' || task.severity === selectedSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'open':
        return <Target className="h-4 w-4 text-gray-500" />;
      case 'overdue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'open':
        return 'outline';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: VulnerabilitySeverity) => {
    switch (severity) {
      case VulnerabilitySeverity.CRITICAL:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case VulnerabilitySeverity.HIGH:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case VulnerabilitySeverity.MEDIUM:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case VulnerabilitySeverity.LOW:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const isOverdue = (dueDate: Date | string) => {
    return new Date() > new Date(dueDate);
  };

  const getDaysUntilDue = (dueDate: Date | string) => {
    const today = new Date();
    const diffTime = new Date(dueDate).getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpdateStatus = (taskId: string, newStatus: string) => {
    toast({
      title: "Status Updated",
      description: `Task status has been updated to ${newStatus.replace('_', ' ')}.`,
    });
  };

  const handleAssignTask = (taskId: string, assignee: string) => {
    toast({
      title: "Task Assigned",
      description: `Task has been assigned to ${assignee}.`,
    });
  };

  const getRemediationStats = () => {
    const stats = tasks.reduce((acc, task) => {
      acc.total++;
      acc[task.status]++;
      if (isOverdue(task.dueDate) && task.status !== 'completed') {
        acc.overdue++;
      }
      return acc;
    }, {
      total: 0,
      open: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0
    });

    const avgResolutionTime = tasks
      .filter(task => task.status === 'completed')
      .reduce((acc, task) => {
        const resolutionTime = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
        return acc + (resolutionTime / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0) / (tasks.filter(task => task.status === 'completed').length || 1);

    return { ...stats, avgResolutionTime };
  };

  const stats = getRemediationStats();

  if (isLoading) {
    return <div className="p-8 text-center">Loading remediation tasks...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load remediation tasks.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="secondary" className="text-xs">{stats.in_progress} In Progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionTime.toFixed(1)}d</div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search remediation tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-500" />
                Open
              </div>
            </SelectItem>
            <SelectItem value="in_progress">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                In Progress
              </div>
            </SelectItem>
            <SelectItem value="completed">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Completed
              </div>
            </SelectItem>
            <SelectItem value="overdue">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Overdue
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value={VulnerabilitySeverity.CRITICAL}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Critical
              </div>
            </SelectItem>
            <SelectItem value={VulnerabilitySeverity.HIGH}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                High
              </div>
            </SelectItem>
            <SelectItem value={VulnerabilitySeverity.MEDIUM}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Medium
              </div>
            </SelectItem>
            <SelectItem value={VulnerabilitySeverity.LOW}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                Low
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No remediation tasks found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery || selectedStatus !== 'all' || selectedSeverity !== 'all' 
                ? 'No tasks match your current filters.' 
                : 'All vulnerabilities have been addressed!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary"
                        onClick={() => setSelectedTask(task)}
                      >
                        {task.title}
                      </CardTitle>
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority} priority
                      </Badge>
                      {getSeverityIcon(task.severity)}
                    </div>
                    
                    <CardDescription className="mb-3">
                      {task.description}
                    </CardDescription>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {task.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTask(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                        <Clock className="h-4 w-4 mr-2" />
                        Mark In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {task.status === 'in_progress' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assigned to:</span>
                    <div className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignedTo.split('@')[0]}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due date:</span>
                    <div className={`font-medium flex items-center gap-1 ${
                      isOverdue(task.dueDate) && task.status !== 'completed' ? 'text-red-600' : ''
                    }`}>
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated:</span>
                    <div className="font-medium">{task.estimatedHours}h</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual:</span>
                    <div className="font-medium">{task.actualHours}h</div>
                  </div>
                </div>

                {task.comments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Last updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {isOverdue(task.dueDate) && task.status !== 'completed' && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Overdue by {Math.abs(getDaysUntilDue(task.dueDate))} day{Math.abs(getDaysUntilDue(task.dueDate)) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTask && getStatusIcon(selectedTask.status)}
              Task Details
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6">
              {/* Task Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Task Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedTask.status)}>
                        {selectedTask.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant={getPriorityColor(selectedTask.priority)}>
                        {selectedTask.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Severity:</span>
                      <div className="flex items-center gap-1">
                        {getSeverityIcon(selectedTask.severity)}
                        <span className="font-medium">{selectedTask.severity}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="font-medium">{selectedTask.progress}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assignment & Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">{selectedTask.assignedTo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due date:</span>
                      <span className={`font-medium ${
                        isOverdue(selectedTask.dueDate) && selectedTask.status !== 'completed' ? 'text-red-600' : ''
                      }`}>
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estimated:</span>
                      <span className="font-medium">{selectedTask.estimatedHours}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-medium">{selectedTask.actualHours}h</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedTask.description}</p>
                </CardContent>
              </Card>

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comments ({selectedTask.comments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTask.comments.map((comment: any) => (
                      <div key={comment.id} className="border-l-4 border-primary pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.author.split('@')[0]}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                    
                    {selectedTask.comments.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No comments yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}