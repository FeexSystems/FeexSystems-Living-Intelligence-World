import 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, DollarSign, Clock, Zap, Brain, Target, Calendar } from 'lucide-react';
import { AIUsageAnalytics as AIUsageAnalyticsType } from '@shared/api';

interface AIUsageAnalyticsProps {
  analytics: AIUsageAnalyticsType;
  isLoading?: boolean;
}

export function AIUsageAnalytics({ analytics, isLoading }: AIUsageAnalyticsProps) {
  const successRate = analytics.totalRequests > 0 
    ? (analytics.successfulRequests / analytics.totalRequests) * 100 
    : 0;

  const failureRate = analytics.totalRequests > 0 
    ? (analytics.failedRequests / analytics.totalRequests) * 100 
    : 0;

  const averageCostPerRequest = analytics.totalRequests > 0 
    ? analytics.totalCost / analytics.totalRequests 
    : 0;

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{analytics.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                <Progress value={successRate} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Processing Time</p>
                <p className="text-2xl font-bold">{formatTime(analytics.averageProcessingTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Request Breakdown</span>
            </CardTitle>
            <CardDescription>
              Overview of your AI request statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Successful</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{analytics.successfulRequests}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({successRate.toFixed(1)}%)
                </span>
              </div>
            </div>
            <Progress value={successRate} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Failed</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{analytics.failedRequests}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({failureRate.toFixed(1)}%)
                </span>
              </div>
            </div>
            <Progress value={failureRate} className="h-2" />

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span>Total Tokens Used</span>
                <span className="font-medium">{analytics.totalTokensUsed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Average Cost per Request</span>
                <span className="font-medium">{formatCurrency(averageCostPerRequest)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Top Services</span>
            </CardTitle>
            <CardDescription>
              Most frequently used AI services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topServices.slice(0, 5).map((service, index) => (
                <div key={service.serviceId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{service.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.requestCount} requests • {service.tokenCount.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(service.cost)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((service.requestCount / analytics.totalRequests) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Daily Usage Trend</span>
          </CardTitle>
          <CardDescription>
            Your AI service usage over the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.dailyUsage.slice(-7).map((day, _index) => {
              const maxRequests = Math.max(...analytics.dailyUsage.map(d => d.requests));
              const percentage = maxRequests > 0 ? (day.requests / maxRequests) * 100 : 0;
              
              return (
                <div key={day.date} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      <span>{day.requests} requests</span>
                      <span>{day.tokens.toLocaleString()} tokens</span>
                      <span>{formatCurrency(day.cost)}</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Usage Insights</span>
          </CardTitle>
          <CardDescription>
            Key insights about your AI service usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Performance Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average tokens per request</span>
                  <span className="font-medium">
                    {Math.round(analytics.totalTokensUsed / analytics.totalRequests)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Most active day</span>
                  <span className="font-medium">
                    {analytics.dailyUsage.reduce((max, day) => 
                      day.requests > max.requests ? day : max
                    ).date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peak processing time</span>
                  <span className="font-medium">
                    {formatTime(Math.max(...analytics.dailyUsage.map(d => d.requests * analytics.averageProcessingTime)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Cost Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Most expensive service</span>
                  <span className="font-medium">
                    {analytics.topServices[0]?.serviceName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily average cost</span>
                  <span className="font-medium">
                    {formatCurrency(analytics.totalCost / analytics.dailyUsage.length)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost efficiency</span>
                  <span className="font-medium">
                    {formatCurrency(analytics.totalCost / analytics.successfulRequests)} per success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}