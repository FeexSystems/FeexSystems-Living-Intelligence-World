import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  MoreHorizontal,
  Trash2,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AIRequest, AIRequestStatus, AIRequestPriority } from '@shared/api';

interface AIRequestHistoryProps {
  requests: AIRequest[];
  onRequestSelect: (request: AIRequest) => void;
  onRequestDelete?: (requestId: string) => void;
  onRequestDuplicate?: (request: AIRequest) => void;
  isLoading?: boolean;
}

export function AIRequestHistory({ 
  requests, 
  onRequestSelect, 
  onRequestDelete,
  onRequestDuplicate,
  isLoading 
}: AIRequestHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const getStatusIcon = (status: AIRequestStatus) => {
    switch (status) {
      case AIRequestStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case AIRequestStatus.FAILED:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case AIRequestStatus.PROCESSING:
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case AIRequestStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: AIRequestStatus) => {
    switch (status) {
      case AIRequestStatus.COMPLETED:
        return 'text-green-600 bg-green-50 border-green-200';
      case AIRequestStatus.FAILED:
        return 'text-red-600 bg-red-50 border-red-200';
      case AIRequestStatus.PROCESSING:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case AIRequestStatus.CANCELLED:
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getPriorityColor = (priority: AIRequestPriority) => {
    switch (priority) {
      case AIRequestPriority.URGENT:
        return 'text-red-600 bg-red-50 border-red-200';
      case AIRequestPriority.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case AIRequestPriority.NORMAL:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case AIRequestPriority.LOW:
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCost = (cost?: number) => {
    if (!cost) return 'N/A';
    return `$${cost.toFixed(4)}`;
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      (request.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.service?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof request.input === 'string' && request.input.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    const matchesService = serviceFilter === 'all' || request.service?.id === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesService;
  });

  const uniqueServices = Array.from(
    new Set(requests.map(r => r.service).filter(Boolean))
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={AIRequestStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={AIRequestStatus.PROCESSING}>Processing</SelectItem>
                <SelectItem value={AIRequestStatus.FAILED}>Failed</SelectItem>
                <SelectItem value={AIRequestStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value={AIRequestPriority.URGENT}>Urgent</SelectItem>
                <SelectItem value={AIRequestPriority.HIGH}>High</SelectItem>
                <SelectItem value={AIRequestPriority.NORMAL}>Normal</SelectItem>
                <SelectItem value={AIRequestPriority.LOW}>Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {uniqueServices.map(service => (
                  <SelectItem key={service!.id} value={service!.id}>
                    {service!.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 text-muted-foreground mb-4 opacity-50">📋</div>
            <h3 className="text-lg font-medium mb-2">No requests found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || serviceFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'You haven\'t made any AI requests yet'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-lg">
                        {request.title || `${request.service?.name} Request`}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status.toLowerCase()}</span>
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(request.priority)}>
                        {request.priority.toLowerCase()}
                      </Badge>
                    </div>

                    {/* Service Info */}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{request.service?.name}</span>
                      <span>•</span>
                      <span>{request.service?.provider}</span>
                      <span>•</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Input Preview */}
                    <div className="text-sm">
                      <p className="text-muted-foreground line-clamp-2">
                        {typeof request.input === 'string' 
                          ? request.input 
                          : JSON.stringify(request.input).substring(0, 200) + '...'
                        }
                      </p>
                    </div>

                    {/* Metadata */}
                    {request.metadata && (
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatProcessingTime(request.metadata.processingTime)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{formatCost(request.metadata.cost)}</span>
                        </div>
                        {request.metadata.inputTokens && (
                          <div className="flex items-center space-x-1">
                            <span>⚡</span>
                            <span>
                              {request.metadata.inputTokens + (request.metadata.outputTokens || 0)} tokens
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRequestSelect(request)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onRequestDuplicate && (
                          <DropdownMenuItem onClick={() => onRequestDuplicate(request)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        {onRequestDelete && (
                          <DropdownMenuItem 
                            onClick={() => onRequestDelete(request.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}