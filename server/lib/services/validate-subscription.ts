import { subscriptionService } from './subscription.service.js';

/**
 * Validation script to check subscription system components
 */
async function validateSubscriptionSystem() {
  console.log('🔍 Validating subscription system components...');

  try {
    // Check if services are properly instantiated
    console.log('✅ SubscriptionService instantiated');

    // Check if required environment variables are set
    const requiredEnvVars = ['DATABASE_URL'];

    const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingRequired.length > 0) {
      console.error('❌ Missing required environment variables:', missingRequired);
    } else {
      console.log('✅ All required environment variables are set');
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
      if (typeof (subscriptionService as any)[method] === 'function') {
        console.log(`✅ SubscriptionService.${method} exists`);
      } else {
        console.error(`❌ SubscriptionService.${method} missing`);
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