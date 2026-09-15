import { stripeService } from './stripe.service.js';

/**
 * Webhook Service Stub
 * 
 * This is a stub implementation when Stripe is not installed.
 * Webhook processing is disabled when Stripe is not configured.
 */
export class WebhookService {
  /**
   * Process Stripe webhook event (stub - does nothing when Stripe is disabled)
   */
  async processStripeWebhook(payload, signature) {
    const event = stripeService.constructWebhookEvent(payload, signature);

    if (!event) {
      console.warn('⚠️ Stripe webhook processing skipped because Stripe is disabled.');
      return;
    }

    // If we get here, Stripe is enabled but this is a stub
    // In production with Stripe installed, this would process the event
    console.log(`📬 Received webhook event: ${event.type} (Stripe integration disabled)`);
  }
}

export const webhookService = new WebhookService();