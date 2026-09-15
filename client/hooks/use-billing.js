import { useState, useEffect } from 'react';
import { 
  SubscriptionStatus,
  PlanInterval,




 
} from '@/../../shared/api';

// Mock API functions - in real app these would call actual API endpoints
const mockApi = {
  getSubscription: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id: 'sub_1',
      userId: 'user_1',
      planId: 'plan_pro',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2024-02-15'),
      currentPeriodEnd: new Date('2024-03-15'),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: 'sub_stripe_123',
      stripeCustomerId: 'cus_stripe_123',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-15')
    };
  },

  getSubscriptionPlans: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
      {
        id: 'plan_starter',
        name: 'Starter',
        description: 'Perfect for individuals',
        price: 9,
        interval: PlanInterval.MONTH,
        currency: 'USD',
        features: [
          '1,000 AI requests/month',
          '10 deployments/month',
          '5 security scans/month',
          '3 team members',
          '10GB storage'
        ],
        limits: {
          aiRequests: 1000,
          deployments: 10,
          securityScans: 5,
          teamMembers: 3,
          storage: 10
        },
        stripePriceId: 'price_starter_monthly'
      },
      {
        id: 'plan_pro',
        name: 'Pro',
        description: 'Perfect for growing teams',
        price: 29,
        interval: PlanInterval.MONTH,
        currency: 'USD',
        features: [
          'Unlimited AI requests',
          '50 deployments/month',
          '20 security scans/month',
          '10 team members',
          '100GB storage'
        ],
        limits: {
          aiRequests: -1,
          deployments: 50,
          securityScans: 20,
          teamMembers: 10,
          storage: 100
        },
        stripePriceId: 'price_pro_monthly',
        isPopular: true
      }
    ];
  },

  getUsageMetrics: async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      userId: 'user_1',
      subscriptionId: 'sub_1',
      period: '2024-02',
      aiRequestsUsed: 1247,
      deploymentsUsed: 32,
      securityScansUsed: 15,
      storageUsed: 67.5,
      bandwidthUsed: 234.8,
      resetDate: new Date('2024-03-15')
    };
  },

  getInvoices: async () => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return [
      {
        id: 'inv_1',
        subscriptionId: 'sub_1',
        stripeInvoiceId: 'in_stripe_123',
        amount: 29,
        currency: 'USD',
        status: 'paid' ,
        invoiceUrl: 'https://invoice.stripe.com/123',
        dueDate: new Date('2024-02-15'),
        paidAt: new Date('2024-02-15'),
        createdAt: new Date('2024-02-15')
      }
    ];
  },

  getPaymentMethods: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      {
        id: 'pm_1',
        userId: 'user_1',
        stripePaymentMethodId: 'pm_stripe_123',
        type: 'card' ,
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
        createdAt: new Date('2024-01-15')
      }
    ];
  }
};

export function useBilling() {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        subscriptionData,
        plansData,
        usageData,
        invoicesData,
        paymentMethodsData
      ] = await Promise.all([
        mockApi.getSubscription(),
        mockApi.getSubscriptionPlans(),
        mockApi.getUsageMetrics(),
        mockApi.getInvoices(),
        mockApi.getPaymentMethods()
      ]);

      // Find the current plan
      const currentPlan = plansData.find(plan => plan.id === subscriptionData.planId);
      
      setSubscription({ ...subscriptionData, plan: currentPlan });
      setPlans(plansData);
      setUsage(usageData);
      setInvoices(invoicesData);
      setPaymentMethods(paymentMethodsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const changePlan = async (planId) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update subscription with new plan
      const newPlan = plans.find(plan => plan.id === planId);
      if (subscription && newPlan) {
        setSubscription({ ...subscription, planId, plan: newPlan });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (data) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (subscription) {
        setSubscription({
          ...subscription,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd,
          status: data.cancelAtPeriodEnd ? subscription.status : SubscriptionStatus.CANCELED
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSubscription = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (subscription) {
        setSubscription({
          ...subscription,
          cancelAtPeriodEnd: false,
          status: SubscriptionStatus.ACTIVE
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const addPaymentMethod = async (data) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add new payment method to list
      const newMethod = {
        id: `pm_${Date.now()}`,
        userId: 'user_1',
        stripePaymentMethodId: `pm_stripe_${Date.now()}`,
        type: 'card',
        last4: data.cardNumber.slice(-4),
        brand: 'visa', // In real app, this would be detected
        expiryMonth: parseInt(data.expiryMonth),
        expiryYear: parseInt(`20${data.expiryYear}`),
        isDefault: data.setAsDefault || paymentMethods.length === 0,
        createdAt: new Date()
      };

      // If setting as default, update other methods
      const updatedMethods = paymentMethods.map(method => ({
        ...method,
        isDefault: data.setAsDefault ? false : method.isDefault
      }));

      setPaymentMethods([...updatedMethods, newMethod]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePaymentMethod = async (id, data) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentMethods(methods => 
        methods.map(method => {
          if (method.id === id) {
            return { ...method, isDefault: data.setAsDefault };
          }
          return { ...method, isDefault: data.setAsDefault ? false : method.isDefault };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment method');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePaymentMethod = async (id) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentMethods(methods => methods.filter(method => method.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscription,
    plans,
    usage,
    invoices,
    paymentMethods,
    isLoading,
    error,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    refresh: loadBillingData
  };
}