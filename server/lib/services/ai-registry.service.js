

/**
 * AI Service Registry - Manages available AI services and their configurations
 */
export class AIServiceRegistry {
   __init() {this.services = new Map()}
   __init2() {this.providers = new Map()}

  constructor() {;AIServiceRegistry.prototype.__init.call(this);AIServiceRegistry.prototype.__init2.call(this);
    this.initializeDefaultServices();
  }

  /**
   * Initialize default AI services
   */
   initializeDefaultServices() {
    // Default providers
    this.providers.set('openai', {
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      timeout: 30000,
      retries: 3
    });

    this.providers.set('anthropic', {
      name: 'Anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      baseUrl: 'https://api.anthropic.com/v1',
      timeout: 30000,
      retries: 3
    });

    this.providers.set('gemini', {
      name: 'Google Gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 30000,
      retries: 2
    });

    // Default services
    const defaultServices = [
      {
        id: 'chat-gemini-flash',
        name: 'Google Gemini Flash',
        description: 'Fast, multimodal, high-intelligence reasoning model from Google',
        category: 'chat',
        pricing: {
          type: 'per_token',
          cost: 0.0005,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 120,
          maxRequestsPerDay: 2000,
          maxTokensPerRequest: 8192,
          maxRequestSize: 2 * 1024 * 1024
        },
        isActive: Boolean(process.env.GEMINI_API_KEY),
        provider: 'gemini',
        parameters: {
          temperature: {
            name: 'temperature',
            type: 'number',
            required: false,
            default: 0.7,
            min: 0,
            max: 2,
            description: 'Controls randomness in the response'
          },
          max_tokens: {
            name: 'max_tokens',
            type: 'number',
            required: false,
            default: 2048,
            min: 1,
            max: 8192,
            description: 'Maximum number of tokens to generate'
          }
        }
      },
      {
        id: 'chat-gpt-3.5',
        name: 'ChatGPT 3.5 Turbo',
        description: 'Fast and efficient conversational AI for general tasks',
        category: 'chat',
        pricing: {
          type: 'per_token',
          cost: 0.002, // $0.002 per 1K tokens
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 100,
          maxRequestsPerDay: 1000,
          maxTokensPerRequest: 4096,
          maxRequestSize: 1024 * 1024 // 1MB
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          temperature: {
            name: 'temperature',
            type: 'number',
            required: false,
            default: 0.7,
            min: 0,
            max: 2,
            description: 'Controls randomness in the response'
          },
          max_tokens: {
            name: 'max_tokens',
            type: 'number',
            required: false,
            default: 1000,
            min: 1,
            max: 4096,
            description: 'Maximum number of tokens to generate'
          },
          system_prompt: {
            name: 'system_prompt',
            type: 'string',
            required: false,
            description: 'System message to guide the AI behavior'
          }
        }
      },
      // --- New AI Features ---
      {
        id: 'text-summarization',
        name: 'Text Summarization',
        description: 'Summarize long-form content into concise summaries',
        category: 'analysis',
        pricing: {
          type: 'per_request',
          cost: 0.01,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxRequestSize: 32 * 1024 // 32KB
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          summary_length: {
            name: 'summary_length',
            type: 'string',
            required: false,
            options: ['short', 'medium', 'long'],
            default: 'medium',
            description: 'Desired summary length'
          }
        }
      },
      {
        id: 'sentiment-analysis',
        name: 'Sentiment Analysis',
        description: 'Analyze sentiment of text (positive, negative, neutral)',
        category: 'analysis',
        pricing: {
          type: 'per_request',
          cost: 0.005,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 100,
          maxRequestsPerDay: 1000,
          maxRequestSize: 16 * 1024 // 16KB
        },
        isActive: true,
        provider: 'openai',
        parameters: {}
      },
      {
        id: 'smart-tagging',
        name: 'Smart Tagging',
        description: 'Suggest relevant tags for content or uploads',
        category: 'processing',
        pricing: {
          type: 'per_request',
          cost: 0.008,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 100,
          maxRequestsPerDay: 1000,
          maxRequestSize: 16 * 1024 // 16KB
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          max_tags: {
            name: 'max_tags',
            type: 'number',
            required: false,
            default: 5,
            min: 1,
            max: 20,
            description: 'Maximum number of tags to suggest'
          }
        }
      },
      {
        id: 'chat-gpt-4',
        name: 'ChatGPT 4',
        description: 'Advanced conversational AI with superior reasoning capabilities',
        category: 'chat',
        pricing: {
          type: 'per_token',
          cost: 0.03, // $0.03 per 1K tokens
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 500,
          maxTokensPerRequest: 8192,
          maxRequestSize: 2 * 1024 * 1024 // 2MB
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          temperature: {
            name: 'temperature',
            type: 'number',
            required: false,
            default: 0.7,
            min: 0,
            max: 2,
            description: 'Controls randomness in the response'
          },
          max_tokens: {
            name: 'max_tokens',
            type: 'number',
            required: false,
            default: 2000,
            min: 1,
            max: 8192,
            description: 'Maximum number of tokens to generate'
          }
        }
      },
      {
        id: 'code-analysis',
        name: 'Code Analysis',
        description: 'Analyze code for bugs, security issues, and improvements',
        category: 'analysis',
        pricing: {
          type: 'per_request',
          cost: 10, // $0.10 per request
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 20,
          maxRequestsPerDay: 100,
          maxRequestSize: 5 * 1024 * 1024 // 5MB
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          language: {
            name: 'language',
            type: 'string',
            required: false,
            options: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'auto'],
            default: 'auto',
            description: 'Programming language of the code'
          },
          analysis_type: {
            name: 'analysis_type',
            type: 'array',
            required: false,
            default: ['bugs', 'security', 'performance'],
            description: 'Types of analysis to perform'
          }
        }
      },
      {
        id: 'text-generation',
        name: 'Text Generation',
        description: 'Generate various types of text content',
        category: 'generation',
        pricing: {
          type: 'per_token',
          cost: 0.002,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 300,
          maxTokensPerRequest: 2048
        },
        isActive: true,
        provider: 'openai',
        parameters: {
          content_type: {
            name: 'content_type',
            type: 'string',
            required: true,
            options: ['article', 'email', 'summary', 'documentation', 'creative'],
            description: 'Type of content to generate'
          },
          tone: {
            name: 'tone',
            type: 'string',
            required: false,
            options: ['professional', 'casual', 'technical', 'creative'],
            default: 'professional',
            description: 'Tone of the generated content'
          }
        }
      },
      // Gemini — grounded chat over World Model
      {
        id: 'chat-gemini-flash',
        name: 'Gemini Flash Chat',
        description: 'Grounded / general chat via Google Gemini Flash. Used by Bushfeexer and Navigator.',
        category: 'chat',
        pricing: {
          type: 'per_token',
          cost: 0,
          currency: 'usd'
        },
        limits: {
          maxRequestsPerHour: 120,
          maxRequestsPerDay: 2000,
          maxTokensPerRequest: 8192,
          maxRequestSize: 1024 * 1024
        },
        isActive: Boolean(process.env.GEMINI_API_KEY),
        provider: 'gemini',
        parameters: {
          temperature: {
            name: 'temperature',
            type: 'number',
            required: false,
            default: 0.3,
            min: 0,
            max: 1,
            description: 'Controls randomness in the response'
          },
          max_tokens: {
            name: 'max_tokens',
            type: 'number',
            required: false,
            default: 1024,
            min: 1,
            max: 8192,
            description: 'Maximum number of tokens to generate'
          }
        }
      }
    ];

    defaultServices.forEach(service => {
      this.services.set(service.id, service);
    });
  }

  /**
   * Get all available AI services
   */
  getServices() {
    return Array.from(this.services.values()).filter(service => service.isActive);
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category) {
    return this.getServices().filter(service => service.category === category);
  }

  /**
   * Get a specific service by ID
   */
  getService(serviceId) {
    return this.services.get(serviceId);
  }

  /**
   * Get provider configuration
   */
  getProvider(providerId) {
    return this.providers.get(providerId);
  }

  /**
   * Register a new AI service
   */
  registerService(service) {
    this.services.set(service.id, service);
  }

  /**
   * Update an existing service
   */
  updateService(serviceId, updates) {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    const updatedService = { ...service, ...updates };
    this.services.set(serviceId, updatedService);
    return true;
  }

  /**
   * Remove a service
   */
  removeService(serviceId) {
    return this.services.delete(serviceId);
  }

  /**
   * Register a new provider
   */
  registerProvider(providerId, config) {
    this.providers.set(providerId, config);
  }

  /**
   * Get all provider configurations
   */
  getProviders() {
    return Object.fromEntries(this.providers);
  }

  /**
   * Load configuration from external source
   */
  loadConfiguration(config) {
    // Clear existing
    this.services.clear();
    this.providers.clear();

    // Load providers
    Object.entries(config.providers).forEach(([id, provider]) => {
      this.providers.set(id, provider);
    });

    // Load services
    Object.entries(config.services).forEach(([id, service]) => {
      this.services.set(id, service);
    });
  }

  /**
   * Export current configuration
   */
  exportConfiguration() {
    return {
      services: Object.fromEntries(this.services),
      providers: Object.fromEntries(this.providers)
    };
  }

  /**
   * Validate service configuration
   */
  validateService(service) {
    const errors = [];

    if (!service.id) errors.push('Service ID is required');
    if (!service.name) errors.push('Service name is required');
    if (!service.provider) errors.push('Service provider is required');
    if (!this.providers.has(service.provider)) {
      errors.push(`Provider '${service.provider}' is not registered`);
    }

    if (!['chat', 'analysis', 'generation', 'processing'].includes(service.category)) {
      errors.push('Invalid service category');
    }

    if (service.limits.maxRequestsPerHour <= 0) {
      errors.push('Max requests per hour must be positive');
    }

    if (service.limits.maxRequestsPerDay <= 0) {
      errors.push('Max requests per day must be positive');
    }

    return errors;
  }
}

// Singleton instance
export const aiServiceRegistry = new AIServiceRegistry();