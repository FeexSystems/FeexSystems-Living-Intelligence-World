import { AIService, AIProviderConfig } from '../types/ai';
import { aiServiceRegistry } from './ai-registry.service';
import { aiWebSocketService } from './ai-websocket.service';

interface ProviderRequest {
  requestId: string;
  input: any;
  parameters: Record<string, any>;
}

interface ProviderResponse {
  result: any;
  tokensUsed?: number;
  citations?: string[];
  confidence?: number;
  model?: string;
}

/**
 * AI Provider Service - Handles communication with external AI providers
 */
export class AIProviderService {
  /**
   * Process AI request using the appropriate provider
   */
  async processRequest(service: AIService, request: ProviderRequest): Promise<ProviderResponse> {
    const provider = aiServiceRegistry.getProvider(service.provider);
    if (!provider) {
      throw new Error(`Provider ${service.provider} not found`);
    }

    switch (service.provider) {
      case 'openai':
        return this.processOpenAIRequest(service, request, provider);
      case 'anthropic':
        return this.processAnthropicRequest(service, request, provider);
      case 'gemini':
        return this.processGeminiRequest(service, request, provider);
      default:
        throw new Error(`Unsupported provider: ${service.provider}`);
    }
  }

  /**
   * Process request using OpenAI API
   */
  private async processOpenAIRequest(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    if (!provider.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      let response: ProviderResponse;

      switch (service.category) {
        case 'chat':
          response = await this.processOpenAIChat(service, request, provider);
          break;
        case 'analysis':
          response = await this.processOpenAIAnalysis(service, request, provider);
          break;
        case 'generation':
          response = await this.processOpenAIGeneration(service, request, provider);
          break;
        default:
          throw new Error(`Unsupported service category: ${service.category}`);
      }

      return response;
    } catch (error) {
      console.error(`OpenAI API error for service ${service.id}:`, error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process chat request with OpenAI
   */
  private async processOpenAIChat(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    const { input, parameters } = request;
    
    // Determine model based on service ID
    const model = service.id.includes('gpt-4') ? 'gpt-4' : 'gpt-3.5-turbo';
    
    const messages = [
      ...(parameters.system_prompt ? [{ role: 'system', content: parameters.system_prompt }] : []),
      { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) }
    ];

    const requestBody = {
      model,
      messages,
      temperature: parameters.temperature || 0.7,
      max_tokens: parameters.max_tokens || 1000,
      stream: true
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    let fullText = '';
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let modelUsed = model;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.replace(/^data: /, '') === '[DONE]') {
            continue;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace(/^data: /, ''));
              const token = data.choices?.[0]?.delta?.content || '';
              if (data.model) modelUsed = data.model;
              if (token) {
                fullText += token;
                if (aiWebSocketService) {
                  aiWebSocketService.sendToRequestSubscribers(request.requestId, 'ai:request-token', {
                    requestId: request.requestId,
                    token
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    }

    if (!fullText) {
      throw new Error('No response from OpenAI API');
    }

    return {
      result: fullText,
      tokensUsed: undefined, // Stream doesn't always provide usage without specific options
      model: modelUsed,
      confidence: 0.9
    };
  }

  /**
   * Process analysis request with OpenAI
   */
  private async processOpenAIAnalysis(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    const { input, parameters } = request;
    
    // Create analysis prompt based on parameters
    const analysisTypes = parameters.analysis_type || ['bugs', 'security', 'performance'];
    const language = parameters.language || 'auto';
    
    const systemPrompt = `You are a code analysis expert. Analyze the provided code for the following aspects: ${analysisTypes.join(', ')}. 
    ${language !== 'auto' ? `The code is written in ${language}.` : 'Detect the programming language automatically.'}
    
    Provide your analysis in the following JSON format:
    {
      "language": "detected_language",
      "issues": [
        {
          "type": "bug|security|performance",
          "severity": "critical|high|medium|low",
          "line": number_or_null,
          "description": "Issue description",
          "recommendation": "How to fix"
        }
      ],
      "summary": "Overall assessment",
      "score": number_between_0_and_100
    }`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please analyze this code:\n\n${input}` }
    ];

    const requestBody = {
      model: 'gpt-4',
      messages,
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 2000
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    try {
      // Try to parse as JSON
      const analysisResult = JSON.parse(content);
      return {
        result: analysisResult,
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
        confidence: 0.85
      };
    } catch (parseError) {
      // If JSON parsing fails, return raw content
      return {
        result: { raw_analysis: content },
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
        confidence: 0.7
      };
    }
  }

  /**
   * Process generation request with OpenAI
   */
  private async processOpenAIGeneration(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    const { input, parameters } = request;
    
    const contentType = parameters.content_type;
    const tone = parameters.tone || 'professional';
    
    const systemPrompt = `You are a professional content writer. Generate ${contentType} content with a ${tone} tone. 
    Follow these guidelines:
    - Be clear and concise
    - Use appropriate formatting
    - Ensure the content is relevant and valuable
    - Match the requested tone and style`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ];

    const requestBody = {
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: parameters.max_tokens || 1500
    };

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    return {
      result: {
        content,
        content_type: contentType,
        tone,
        word_count: content.split(/\s+/).length
      },
      tokensUsed: data.usage?.total_tokens,
      model: data.model,
      confidence: 0.8
    };
  }

  /**
   * Process request using Anthropic API (Claude)
   */
  private async processAnthropicRequest(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    if (!provider.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Placeholder for Anthropic implementation
    // This would be implemented similarly to OpenAI but using Claude's API
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Process request using Google Gemini API
   */
  private async processGeminiRequest(
    service: AIService,
    request: ProviderRequest,
    provider: AIProviderConfig
  ): Promise<ProviderResponse> {
    if (!provider.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const input =
      typeof request.input === 'string'
        ? request.input
        : JSON.stringify(request.input);

    const url = `${provider.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${provider.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input }] }],
        generationConfig: {
          temperature: request.parameters.temperature ?? 0.3,
          maxOutputTokens: request.parameters.max_tokens ?? 1024,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini API error: ${res.status} — ${errText}`);
    }

    let fullText = '';
    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.substring(6));
              const token = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (token) {
                fullText += token;
                if (aiWebSocketService) {
                  aiWebSocketService.sendToRequestSubscribers(request.requestId, 'ai:request-token', {
                    requestId: request.requestId,
                    token
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    }

    if (!fullText) {
      throw new Error('Empty Gemini response');
    }

    return { result: fullText, model, confidence: 0.85 };
  }

  /**
   * Test provider connection
   */
  async testProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = aiServiceRegistry.getProvider(providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }

      switch (providerId) {
        case 'openai':
          return this.testOpenAIConnection(provider);
        case 'anthropic':
          return this.testAnthropicConnection(provider);
        case 'gemini':
          return this.testGeminiConnection(provider);
        default:
          return { success: false, error: 'Unsupported provider' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test OpenAI connection
   */
  private async testOpenAIConnection(provider: AIProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Test Anthropic connection
   */
  private async testAnthropicConnection(provider: AIProviderConfig): Promise<{ success: boolean; error?: string }> {
    // Placeholder for Anthropic connection test
    return { success: false, error: 'Anthropic provider not yet implemented' };
  }

  /**
   * Test Gemini connection via model list endpoint
   */
  private async testGeminiConnection(provider: AIProviderConfig): Promise<{ success: boolean; error?: string }> {
    if (!provider.apiKey) {
      return { success: false, error: 'GEMINI_API_KEY not configured' };
    }
    try {
      const url = `${provider.baseUrl}/models?key=${provider.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gemini connection failed',
      };
    }
  }
}

// Singleton instance
export const aiProviderService = new AIProviderService();