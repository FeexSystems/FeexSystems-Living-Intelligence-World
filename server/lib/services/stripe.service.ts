/**
 * Stripe Service Stub
 * 
 * This is a stub implementation when Stripe is not installed.
 * All methods return null/false to indicate Stripe is disabled.
 */

// Stub Stripe types
interface StubSession {
  id: string;
  url: string | null;
}

interface StubCustomer {
  id: string;
}

interface StubSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
}

interface StubInvoice {
  id: string;
}

interface StubEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

export class StripeService {
  private enabled: boolean = false;

  constructor() {
    console.warn('⚠️ Stripe integration is disabled. Install stripe package to enable billing features.');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  _setEnabledForTesting(enabled: boolean) {
    this.enabled = enabled;
  }

  async createCustomer(
    _email: string,
    _name: string,
    _metadata?: Record<string, string>
  ): Promise<StubCustomer | null> {
    console.warn('⚠️ Stripe disabled: createCustomer called but returning null');
    return null;
  }

  async createSubscription(
    _customerId: string,
    _priceId: string,
    _options?: { trialPeriodDays?: number; metadata?: Record<string, string> }
  ): Promise<StubSubscription | null> {
    console.warn('⚠️ Stripe disabled: createSubscription called but returning null');
    return null;
  }

  async updateSubscription(
    _subscriptionId: string,
    _updates: { priceId?: string; cancelAtPeriodEnd?: boolean }
  ): Promise<StubSubscription | null> {
    console.warn('⚠️ Stripe disabled: updateSubscription called but returning null');
    return null;
  }

  async cancelSubscription(
    _subscriptionId: string,
    _immediately: boolean = false
  ): Promise<StubSubscription | null> {
    console.warn('⚠️ Stripe disabled: cancelSubscription called but returning null');
    return null;
  }

  async createBillingPortalSession(
    _customerId: string,
    _returnUrl: string
  ): Promise<StubSession | null> {
    console.warn('⚠️ Stripe disabled: createBillingPortalSession called but returning null');
    return null;
  }

  async createCheckoutSession(
    _options: {
      customerId?: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
      mode?: 'subscription' | 'payment';
      metadata?: Record<string, string>;
    }
  ): Promise<StubSession | null> {
    console.warn('⚠️ Stripe disabled: createCheckoutSession called but returning null');
    return null;
  }

  constructWebhookEvent(
    _payload: string | Buffer,
    _signature: string
  ): StubEvent | null {
    console.warn('⚠️ Stripe disabled: constructWebhookEvent called but returning null');
    return null;
  }

  async createInvoiceItem(
    _options: {
      customer: string;
      amount: number;
      currency: string;
      description: string;
    }
  ): Promise<unknown | null> {
    console.warn('⚠️ Stripe disabled: createInvoiceItem called but returning null');
    return null;
  }

  async createInvoice(
    _options: {
      customer: string;
      auto_advance?: boolean;
      collection_method?: string;
      description?: string;
    }
  ): Promise<StubInvoice | null> {
    console.warn('⚠️ Stripe disabled: createInvoice called but returning null');
    return null;
  }

  async finalizeInvoice(_invoiceId: string): Promise<StubInvoice | null> {
    console.warn('⚠️ Stripe disabled: finalizeInvoice called but returning null');
    return null;
  }

  async getSubscription(_subscriptionId: string): Promise<StubSubscription | null> {
    console.warn('⚠️ Stripe disabled: getSubscription called but returning null');
    return null;
  }

  async getCustomer(_customerId: string): Promise<StubCustomer | null> {
    console.warn('⚠️ Stripe disabled: getCustomer called but returning null');
    return null;
  }
}

export const stripeService = new StripeService();