import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Loader2, Settings, DollarSign, Clock, Zap } from 'lucide-react';
import { 
  AIService, 
  AIRequestPriority, 
  CreateAIRequestRequest,
  type AIRequest 
} from '@shared/api';

interface AIRequestFormProps {
  service: AIService;
  onSubmit: (request: CreateAIRequestRequest) => Promise<AIRequest>;
  isLoading?: boolean;
  templates?: Array<{
    id: string;
    name: string;
    input: any;
    parameters: Record<string, any>;
  }>;
}

export function AIRequestForm({ service, onSubmit, isLoading, templates = [] }: AIRequestFormProps) {
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<AIRequestPriority>(AIRequestPriority.NORMAL);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Initialize default parameters based on service
  useEffect(() => {
    const defaultParams: Record<string, any> = {};
    
    // Common parameters for different service types
    if (service.category === 'CHAT' || service.category === 'GENERATION') {
      defaultParams.temperature = 0.7;
      defaultParams.maxTokens = 1000;
      defaultParams.topP = 1.0;
    }
    
    if (service.category === 'VISION') {
      defaultParams.detail = 'auto';
      defaultParams.maxTokens = 300;
    }
    
    if (service.category === 'AUDIO') {
      defaultParams.language = 'auto';
      defaultParams.format = 'json';
    }
    
    setParameters(defaultParams);
  }, [service]);

  // Calculate estimated cost based on input length and parameters
  useEffect(() => {
    const inputTokens = Math.ceil(input.length / 4); // Rough estimation
    const outputTokens = parameters.maxTokens || 1000;
    const cost = (inputTokens * service.pricing.inputTokenPrice + 
                 outputTokens * service.pricing.outputTokenPrice) / 1000;
    setEstimatedCost(cost);
  }, [input, parameters, service.pricing]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setInput(typeof template.input === 'string' ? template.input : JSON.stringify(template.input, null, 2));
      setParameters({ ...parameters, ...template.parameters });
      setTitle(template.name);
    }
    setSelectedTemplate(templateId);
  };

  const handleParameterChange = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let processedInput: any = input;
    
    // Try to parse JSON input for structured services
    if (service.category === 'ANALYSIS' || service.category === 'PROCESSING') {
      try {
        processedInput = JSON.parse(input);
      } catch {
        // Keep as string if not valid JSON
      }
    }
    
    const request: CreateAIRequestRequest = {
      serviceId: service.id,
      title: title || `${service.name} Request`,
      input: processedInput,
      parameters,
      priority
    };
    
    await onSubmit(request);
  };

  const renderParameterControl = (key: string, value: any) => {
    switch (key) {
      case 'temperature':
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key}>Temperature</Label>
              <span className="text-sm text-muted-foreground">{value}</span>
            </div>
            <Slider
              id={key}
              min={0}
              max={2}
              step={0.1}
              value={[value]}
              onValueChange={([newValue]) => handleParameterChange(key, newValue)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls randomness. Lower values make output more focused and deterministic.
            </p>
          </div>
        );
        
      case 'maxTokens':
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key}>Max Tokens</Label>
              <span className="text-sm text-muted-foreground">{value}</span>
            </div>
            <Slider
              id={key}
              min={1}
              max={service.limits.maxTokens}
              step={1}
              value={[value]}
              onValueChange={([newValue]) => handleParameterChange(key, newValue)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens to generate in the response.
            </p>
          </div>
        );
        
      case 'topP':
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={key}>Top P</Label>
              <span className="text-sm text-muted-foreground">{value}</span>
            </div>
            <Slider
              id={key}
              min={0}
              max={1}
              step={0.01}
              value={[value]}
              onValueChange={([newValue]) => handleParameterChange(key, newValue)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls diversity via nucleus sampling. Lower values focus on more likely tokens.
            </p>
          </div>
        );
        
      case 'detail':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>Detail Level</Label>
            <Select value={value} onValueChange={(newValue) => handleParameterChange(key, newValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'language':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>Language</Label>
            <Select value={value} onValueChange={(newValue) => handleParameterChange(key, newValue)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
        
      default:
        if (typeof value === 'boolean') {
          return (
            <div key={key} className="flex items-center space-x-2">
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) => handleParameterChange(key, checked)}
              />
              <Label htmlFor={key} className="capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </Label>
            </div>
          );
        }
        
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="capitalize">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </Label>
            <Input
              id={key}
              value={value}
              onChange={(e) => handleParameterChange(key, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{service.name}</span>
              <Badge variant="outline">{service.category.toLowerCase()}</Badge>
            </CardTitle>
            <CardDescription>
              Create a new request for {service.provider} {service.model}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span>${estimatedCost.toFixed(4)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Templates</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Request Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your request a descriptive title"
            />
          </div>
          
          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="input">
              Input
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getInputPlaceholder(service.category)}
              rows={6}
              required
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{input.length} characters</span>
              <span>~{Math.ceil(input.length / 4)} tokens</span>
            </div>
          </div>
          
          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as AIRequestPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AIRequestPriority.LOW}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Low Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value={AIRequestPriority.NORMAL}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Normal Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value={AIRequestPriority.HIGH}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>High Priority</span>
                  </div>
                </SelectItem>
                <SelectItem value={AIRequestPriority.URGENT}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Urgent Priority</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Advanced Parameters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
              <Label htmlFor="advanced" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Advanced Parameters</span>
              </Label>
            </div>
            
            {showAdvanced && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {Object.entries(parameters).map(([key, value]) => 
                    renderParameterControl(key, value)
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          <Separator />
          
          {/* Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Rate limit: {service.limits.rateLimitPerMinute}/min</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>Max tokens: {service.limits.maxTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>
                ${service.pricing.inputTokenPrice}/1K in, ${service.pricing.outputTokenPrice}/1K out
              </span>
            </div>
          </div>
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Request...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function getInputPlaceholder(category: string): string {
  switch (category) {
    case 'CHAT':
      return 'Enter your message or question here...';
    case 'ANALYSIS':
      return 'Provide the text or data you want to analyze...';
    case 'GENERATION':
      return 'Describe what you want to generate...';
    case 'PROCESSING':
      return 'Enter the data or content to process...';
    case 'VISION':
      return 'Describe the image or provide image URL...';
    case 'AUDIO':
      return 'Provide audio file URL or describe the audio task...';
    default:
      return 'Enter your input here...';
  }
}