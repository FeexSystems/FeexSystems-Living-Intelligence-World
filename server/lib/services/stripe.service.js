/**
 * Stripe Service Stub
 * 
 * This is a stub implementation when Stripe is not installed.
 * All methods return null/false to indicate Stripe is disabled.
 */

// Stub Stripe types


























export class StripeService {
   __init() {this.enabled = false}

  constructor() {;StripeService.prototype.__init.call(this);
    console.warn('⚠️ Stripe integration is disabled. Install stripe package to enable billing features.');
  }

  isEnabled() {
    return this.enabled;
  }

  async createCustomer(
    _email,
    _name,
    _metadata
  ) {
    console.warn('⚠️ Stripe disabled: createCustomer called but returning null');
    return null;
  }

  async createSubscription(
    _customerId,
    _priceId,
    _options
  ) {
    console.warn('⚠️ Stripe disabled: createSubscription called but returning null');
    return null;
  }

  async updateSubscription(
    _subscriptionId,
    _updates
  ) {
    console.warn('⚠️ Stripe disabled: updateSubscription called but returning null');
    return null;
  }

  async cancelSubscription(
    _subscriptionId,
    _immediately = false
  ) {
    console.warn('⚠️ Stripe disabled: cancelSubscription called but returning null');
    return null;
  }

  async createBillingPortalSession(
    _customerId,
    _returnUrl
  ) {
    console.warn('⚠️ Stripe disabled: createBillingPortalSession called but returning null');
    return null;
  }

  async createCheckoutSession(
    _options







  ) {
    console.warn('⚠️ Stripe disabled: createCheckoutSession called but returning null');
    return null;
  }

  constructWebhookEvent(
    _payload,
    _signature
  ) {
    console.warn('⚠️ Stripe disabled: constructWebhookEvent called but returning null');
    return null;
  }

  async createInvoiceItem(
    _options





  ) {
    console.warn('⚠️ Stripe disabled: createInvoiceItem called but returning null');
    return null;
  }

  async createInvoice(
    _options





  ) {
    console.warn('⚠️ Stripe disabled: createInvoice called but returning null');
    return null;
  }

  async finalizeInvoice(_invoiceId) {
    console.warn('⚠️ Stripe disabled: finalizeInvoice called but returning null');
    return null;
  }

  async getSubscription(_subscriptionId) {
    console.warn('⚠️ Stripe disabled: getSubscription called but returning null');
    return null;
  }

  async getCustomer(_customerId) {
    console.warn('⚠️ Stripe disabled: getCustomer called but returning null');
    return null;
  }
}

export const stripeService = new StripeService();