 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types













































































// Mock API functions (replace with actual API calls)
const mockApiCall = (data, delay = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

const fetchAIServices = async () => {
  // Mock data - replace with actual API call
  return mockApiCall([
    {
      id: '1',
      name: 'GPT-4 Chat',
      description: 'Advanced conversational AI with reasoning capabilities',
      category: 'CHAT',
      provider: 'OpenAI',
      model: 'gpt-4',
      pricing: {
        inputTokenPrice: 0.03,
        outputTokenPrice: 0.06,
        currency: 'USD'
      },
      limits: {
        maxTokens: 8192,
        maxRequests: 1000,
        rateLimitPerMinute: 60
      },
      capabilities: ['text-generation', 'reasoning', 'code-generation'],
      isActive: true,
      iconUrl: '/icons/openai.svg',
      documentationUrl: 'https://platform.openai.com/docs'
    },
    {
      id: '2',
      name: 'Claude Analysis',
      description: 'Advanced text analysis and reasoning',
      category: 'ANALYSIS',
      provider: 'Anthropic',
      model: 'claude-3',
      pricing: {
        inputTokenPrice: 0.025,
        outputTokenPrice: 0.05,
        currency: 'USD'
      },
      limits: {
        maxTokens: 4096,
        maxRequests: 500,
        rateLimitPerMinute: 30
      },
      capabilities: ['text-analysis', 'reasoning', 'summarization'],
      isActive: true,
      iconUrl: '/icons/anthropic.svg',
      documentationUrl: 'https://docs.anthropic.com'
    }
  ]);
};

const fetchAIRequests = async (page = 1, limit = 10) => {
  // Mock data - replace with actual API call
  return mockApiCall({
    requests: [
      {
        id: '1',
        userId: 'user1',
        serviceId: '1',
        title: 'Code Review Request',
        input: { code: 'function example() { return "hello"; }' },
        priority: 'NORMAL' ,
        status: 'COMPLETED' ,
        result: { review: 'Code looks good!', suggestions: [] },
        metadata: {
          processingTime: 2500,
          inputTokens: 50,
          outputTokens: 25,
          cost: 0.0045,
          model: 'gpt-4'
        },
        createdAt: new Date(Date.now() - 3600000),
        startedAt: new Date(Date.now() - 3598000),
        completedAt: new Date(Date.now() - 3595000)
      }
    ],
    total: 1
  });
};

const fetchAIUsageAnalytics = async (period = '7d') => {
  // Mock data - replace with actual API call
  return mockApiCall({
    userId: 'user1',
    period,
    totalRequests: 150,
    successfulRequests: 142,
    failedRequests: 8,
    totalTokensUsed: 25000,
    totalCost: 12.50,
    averageProcessingTime: 2800,
    topServices: [
      {
        serviceId: '1',
        serviceName: 'GPT-4 Chat',
        requestCount: 85,
        tokenCount: 15000,
        cost: 8.25
      },
      {
        serviceId: '2',
        serviceName: 'Claude Analysis',
        requestCount: 65,
        tokenCount: 10000,
        cost: 4.25
      }
    ],
    dailyUsage: [
      { date: '2024-01-01', requests: 20, tokens: 3500, cost: 1.75 },
      { date: '2024-01-02', requests: 25, tokens: 4200, cost: 2.10 },
      { date: '2024-01-03', requests: 18, tokens: 3100, cost: 1.55 },
      { date: '2024-01-04', requests: 22, tokens: 3800, cost: 1.90 },
      { date: '2024-01-05', requests: 28, tokens: 4500, cost: 2.25 },
      { date: '2024-01-06', requests: 19, tokens: 3200, cost: 1.60 },
      { date: '2024-01-07', requests: 18, tokens: 2700, cost: 1.35 }
    ]
  });
};

const createAIRequest = async (data





) => {
  // Mock API call - replace with actual implementation
  return mockApiCall({
    id: Math.random().toString(36).substr(2, 9),
    userId: 'user1',
    serviceId: data.serviceId,
    title: data.title,
    input: data.input,
    parameters: data.parameters,
    priority: (data.priority ) || 'NORMAL',
    status: 'PENDING' ,
    createdAt: new Date()
  });
};

// Custom hook
export const useAIServices = () => {
  const queryClient = useQueryClient();

  // Fetch AI services
  const {
    data: services = [],
    isLoading: servicesLoading,
    error: servicesError
  } = useQuery({
    queryKey: ['ai-services'],
    queryFn: fetchAIServices,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch AI requests
  const {
    data: requestsData,
    isLoading: requestsLoading,
    error: requestsError
  } = useQuery({
    queryKey: ['ai-requests'],
    queryFn: () => fetchAIRequests(),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch usage analytics
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError
  } = useQuery({
    queryKey: ['ai-usage-analytics'],
    queryFn: () => fetchAIUsageAnalytics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create AI request mutation
  const createRequestMutation = useMutation({
    mutationFn: createAIRequest,
    onSuccess: (newRequest) => {
      // Invalidate and refetch requests
      queryClient.invalidateQueries({ queryKey: ['ai-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage-analytics'] });
      
      toast.success('AI request created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create AI request');
    },
  });

  // Helper functions
  const getServiceById = (serviceId) => {
    return services.find(service => service.id === serviceId);
  };

  const getServicesByCategory = (category) => {
    return services.filter(service => service.category === category);
  };

  const getActiveServices = () => {
    return services.filter(service => service.isActive);
  };

  return {
    // Data
    services,
    requests: _optionalChain([requestsData, 'optionalAccess', _ => _.requests]) || [],
    requestsTotal: _optionalChain([requestsData, 'optionalAccess', _2 => _2.total]) || 0,
    analytics,

    // Loading states
    servicesLoading,
    requestsLoading,
    analyticsLoading,
    isCreatingRequest: createRequestMutation.isPending,

    // Error states
    servicesError,
    requestsError,
    analyticsError,

    // Actions
    createRequest: createRequestMutation.mutate,
    
    // Helper functions
    getServiceById,
    getServicesByCategory,
    getActiveServices,

    // Refresh functions
    refreshServices: () => queryClient.invalidateQueries({ queryKey: ['ai-services'] }),
    refreshRequests: () => queryClient.invalidateQueries({ queryKey: ['ai-requests'] }),
    refreshAnalytics: () => queryClient.invalidateQueries({ queryKey: ['ai-usage-analytics'] }),
  };
};