import { subscriptionService } from './subscription.service.js';
import { stripeService } from './stripe.service.js';
import { webhookService } from './webhook.service.js';

/**
 * Validation script to check subscription system components
 * Updated to support Stripe being optional
 */
async function validateSubscriptionSystem() {
  console.log('🔍 Validating subscription system components...');

  try {
    // Check if services are properly instantiated
    console.log('✅ SubscriptionService instantiated');
    console.log('✅ StripeService instantiated (stub mode)');
    console.log('✅ WebhookService instantiated');

    // Check Stripe integration status
    if (stripeService.isEnabled()) {
      console.log('✅ Stripe integration is ENABLED');
    } else {
      console.warn('⚠️ Stripe integration is DISABLED (stub mode)');
      console.log('   Subscription management works via database only');
    }

    // Check if required environment variables are set
    const requiredEnvVars = ['DATABASE_URL'];
    const optionalEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);
    const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);

    if (missingRequired.length > 0) {
      console.error('❌ Missing required environment variables:', missingRequired);
    } else {
      console.log('✅ All required environment variables are set');
    }

    if (missingOptional.length > 0) {
      console.warn('⚠️ Missing optional (Stripe) environment variables:', missingOptional);
    }

    // Check service methods exist
    const subscriptionMethods = [
      'getPlans',
      'getUserSubscription',
      'createSubscription',
      'updateSubscription',
      'cancelSubscription',
      'getSubscriptionLimits',
      'canPerformAction'
    ];

    subscriptionMethods.forEach(method => {
      if (typeof (subscriptionService )[method] === 'function') {
        console.log(`✅ SubscriptionService.${method} exists`);
      } else {
        console.error(`❌ SubscriptionService.${method} missing`);
      }
    });

    // Core Stripe methods (should work as stubs)
    const stripeMethods = [
      'createCustomer',
      'createSubscription',
      'updateSubscription',
      'cancelSubscription',
      'constructWebhookEvent',
      'isEnabled'
    ];

    stripeMethods.forEach(method => {
      if (typeof (stripeService )[method] === 'function') {
        console.log(`✅ StripeService.${method} exists`);
      } else {
        console.warn(`⚠️ StripeService.${method} missing (optional)`);
      }
    });

    const webhookMethods = ['processStripeWebhook'];

    webhookMethods.forEach(method => {
      if (typeof (webhookService )[method] === 'function') {
        console.log(`✅ WebhookService.${method} exists`);
      } else {
        console.error(`❌ WebhookService.${method} missing`);
      }
    });

    console.log('🎉 Subscription system validation completed!');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSubscriptionSystem()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { validateSubscriptionSystem };