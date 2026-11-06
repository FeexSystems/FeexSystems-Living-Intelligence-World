/**
 * AI Gateway
 *
 * Facade over AI services (ai.service, ai-gateway, ai-provider, etc.)
 */

import { aiService } from '../services/ai.service';

export const aiGateway = {
  // Delegate to the underlying AI service manager
  get service() {
    return aiService;
  },
};
