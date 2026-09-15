 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { aiServiceRegistry } from './ai-registry.service';














/**
 * AI Provider Service - Handles communication with external AI providers
 */
export class AIProviderService {
  /**
   * Process AI request using the appropriate provider
   */
  async processRequest(service, request) {
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
   async processOpenAIRequest(
    service,
    request,
    provider
  ) {
    if (!provider.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      let response;

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
   async processOpenAIChat(
    service,
    request,
    provider
  ) {
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
      stream: false
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
      throw new Error(`OpenAI API error: ${response.status} - ${_optionalChain([errorData, 'access', _ => _.error, 'optionalAccess', _2 => _2.message]) || response.statusText}`);
    }

    const data = await response.json();
    const choice = _optionalChain([data, 'access', _3 => _3.choices, 'optionalAccess', _4 => _4[0]]);
    
    if (!choice) {
      throw new Error('No response from OpenAI API');
    }

    return {
      result: choice.message.content,
      tokensUsed: _optionalChain([data, 'access', _5 => _5.usage, 'optionalAccess', _6 => _6.total_tokens]),
      model: data.model,
      confidence: choice.finish_reason === 'stop' ? 0.9 : 0.7
    };
  }

  /**
   * Process analysis request with OpenAI
   */
   async processOpenAIAnalysis(
    service,
    request,
    provider
  ) {
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
      throw new Error(`OpenAI API error: ${response.status} - ${_optionalChain([errorData, 'access', _7 => _7.error, 'optionalAccess', _8 => _8.message]) || response.statusText}`);
    }

    const data = await response.json();
    const content = _optionalChain([data, 'access', _9 => _9.choices, 'optionalAccess', _10 => _10[0], 'optionalAccess', _11 => _11.message, 'optionalAccess', _12 => _12.content]);
    
    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    try {
      // Try to parse as JSON
      const analysisResult = JSON.parse(content);
      return {
        result: analysisResult,
        tokensUsed: _optionalChain([data, 'access', _13 => _13.usage, 'optionalAccess', _14 => _14.total_tokens]),
        model: data.model,
        confidence: 0.85
      };
    } catch (parseError) {
      // If JSON parsing fails, return raw content
      return {
        result: { raw_analysis: content },
        tokensUsed: _optionalChain([data, 'access', _15 => _15.usage, 'optionalAccess', _16 => _16.total_tokens]),
        model: data.model,
        confidence: 0.7
      };
    }
  }

  /**
   * Process generation request with OpenAI
   */
   async processOpenAIGeneration(
    service,
    request,
    provider
  ) {
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
      throw new Error(`OpenAI API error: ${response.status} - ${_optionalChain([errorData, 'access', _17 => _17.error, 'optionalAccess', _18 => _18.message]) || response.statusText}`);
    }

    const data = await response.json();
    const content = _optionalChain([data, 'access', _19 => _19.choices, 'optionalAccess', _20 => _20[0], 'optionalAccess', _21 => _21.message, 'optionalAccess', _22 => _22.content]);
    
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
      tokensUsed: _optionalChain([data, 'access', _23 => _23.usage, 'optionalAccess', _24 => _24.total_tokens]),
      model: data.model,
      confidence: 0.8
    };
  }

  /**
   * Process request using Anthropic API (Claude)
   */
   async processAnthropicRequest(
    service,
    request,
    provider
  ) {
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
   async processGeminiRequest(
    service,
    request,
    provider
  ) {
    if (!provider.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const input =
      typeof request.input === 'string'
        ? request.input
        : JSON.stringify(request.input);

    const url = `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input }] }],
        generationConfig: {
          temperature: _nullishCoalesce(request.parameters.temperature, () => ( 0.3)),
          maxOutputTokens: _nullishCoalesce(request.parameters.max_tokens, () => ( 1024)),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Gemini API error: ${res.status} — ${errText}`);
    }

    const data = await res.json();
    const text = _optionalChain([data, 'optionalAccess', _25 => _25.candidates, 'optionalAccess', _26 => _26[0], 'optionalAccess', _27 => _27.content, 'optionalAccess', _28 => _28.parts, 'optionalAccess', _29 => _29[0], 'optionalAccess', _30 => _30.text]);
    if (!text) {
      throw new Error('Empty Gemini response');
    }

    return { result: text, model, confidence: 0.85 };
  }

  /**
   * Test provider connection
   */
  async testProvider(providerId) {
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
   async testOpenAIConnection(provider) {
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
   async testAnthropicConnection(provider) {
    // Placeholder for Anthropic connection test
    return { success: false, error: 'Anthropic provider not yet implemented' };
  }

  /**
   * Test Gemini connection via model list endpoint
   */
   async testGeminiConnection(provider) {
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