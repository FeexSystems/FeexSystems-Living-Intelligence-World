import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, 
  Download, 
  RefreshCw, 
  Clock, 
  DollarSign, 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Share2
} from 'lucide-react';
import { 
  AIRequest, 
  AIRequestStatus,
  AIRequestPriority 
} from '@shared/api';
import { useAIRequestStatus } from '@/hooks/use-realtime-status';

interface AIResponseDisplayProps {
  request: AIRequest;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  onDownload?: (content: string, filename: string) => void;
  onFeedback?: (requestId: string, rating: 'positive' | 'negative') => void;
  isLoading?: boolean;
}

export function AIResponseDisplay({ 
  request, 
  onRetry, 
  onCopy, 
  onDownload, 
  onFeedback,
  isLoading 
}: AIResponseDisplayProps) {
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>('');
  
  const statusContext = useAIRequestStatus(request.id);
  const realTimeStatus = statusContext.getStatus(request.id);
  
  const displayStatus = realTimeStatus 
    ? realTimeStatus.status.toUpperCase() as AIRequestStatus 
    : request.status;

  const displayResult = realTimeStatus?.status === 'completed' && realTimeStatus.metadata?.result
    ? realTimeStatus.metadata.result
    : request.result;

  useEffect(() => {
    setStreamedContent('');
  }, [request.id]);

  useEffect(() => {
    const handleToken = (e: CustomEvent) => {
      if (e.detail.requestId === request.id) {
        setStreamedContent(prev => prev + e.detail.token);
      }
    };
    window.addEventListener('ai_request_token', handleToken as EventListener);
    return () => window.removeEventListener('ai_request_token', handleToken as EventListener);
  }, [request.id]);

  const getStatusIcon = (status: AIRequestStatus) => {
    switch (status) {
      case AIRequestStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case AIRequestStatus.FAILED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case AIRequestStatus.PROCESSING:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case AIRequestStatus.CANCELLED:
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
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

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(content);
      onCopy?.(content);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = (content: string) => {
    const filename = `ai-response-${request.id}-${new Date().toISOString().split('T')[0]}.txt`;
    onDownload?.(content, filename);
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return 'N/A';
    return `$${cost.toFixed(4)}`;
  };

  const renderResult = () => {
    const result = displayResult || streamedContent;
    if (!result) return null;
    
    // Handle different types of results
    if (typeof result === 'string') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Response</h4>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(result)}
                disabled={isLoading}
              >
                {copiedContent === result ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copiedContent === result ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(result)}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </ScrollArea>
        </div>
      );
    }

    // Handle structured results
    if (typeof result === 'object') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Response</h4>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(JSON.stringify(result, null, 2))}
                disabled={isLoading}
              >
                {copiedContent === JSON.stringify(result, null, 2) ? (
                  <CheckCircle className="w-4 h-4 mr-1" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copiedContent === JSON.stringify(result, null, 2) ? 'Copied' : 'Copy JSON'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(JSON.stringify(result, null, 2))}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </ScrollArea>
        </div>
      );
    }

    return null;
  };

  const renderError = () => {
    if (!request.error) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-red-600">Error Details</h4>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">{request.error.code}</span>
              </div>
              <p className="text-sm text-red-700">{request.error.message}</p>
              {request.error.details && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer">Technical Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {JSON.stringify(request.error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">
                {request.title || `${request.service?.name} Request`}
              </CardTitle>
              <Badge className={getStatusColor(displayStatus)}>
                {getStatusIcon(displayStatus)}
                <span className="ml-1">{displayStatus.toLowerCase()}</span>
              </Badge>
              <Badge variant="outline" className={getPriorityColor(request.priority)}>
                {request.priority.toLowerCase()}
              </Badge>
            </div>
            <CardDescription>
              {request.service?.name} • {request.service?.provider} • {request.service?.model}
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            {displayStatus === AIRequestStatus.FAILED && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Request Input */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Input</h4>
          <ScrollArea className="h-32 w-full rounded-md border p-3 bg-muted/50">
            <pre className="whitespace-pre-wrap text-sm">
              {typeof request.input === 'string' 
                ? request.input 
                : JSON.stringify(request.input, null, 2)
              }
            </pre>
          </ScrollArea>
        </div>

        <Separator />

        {/* Response or Error */}
        {(displayStatus === AIRequestStatus.COMPLETED || streamedContent) && renderResult()}
        {displayStatus === AIRequestStatus.FAILED && renderError()}
        {displayStatus === AIRequestStatus.PROCESSING && !streamedContent && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-muted-foreground">Processing your request...</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        {request.metadata && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatProcessingTime(request.metadata.processingTime)}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Zap className="w-4 h-4" />
                <span>
                  {request.metadata.inputTokens || 0} + {request.metadata.outputTokens || 0} tokens
                </span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>{formatCost(request.metadata.cost)}</span>
              </div>
              {request.metadata.confidence && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <span>Confidence: {(request.metadata.confidence * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Citations */}
        {request.metadata?.citations && request.metadata.citations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Citations</h4>
              <div className="space-y-1">
                {request.metadata.citations.map((citation, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    <a 
                      href={citation} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {citation}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Feedback */}
        {displayStatus === AIRequestStatus.COMPLETED && onFeedback && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Was this response helpful?</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(request.id, 'positive')}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFeedback(request.id, 'negative')}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(request.createdAt).toLocaleString()}</div>
          {request.startedAt && (
            <div>Started: {new Date(request.startedAt).toLocaleString()}</div>
          )}
          {request.completedAt && (
            <div>Completed: {new Date(request.completedAt).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}