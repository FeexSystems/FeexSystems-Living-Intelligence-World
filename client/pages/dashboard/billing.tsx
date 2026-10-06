import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  CheckCircle,
  Download,
  FileText,
  Zap,
  Users,
  Shield,
  Code,
  Bot,
  Star,
  ArrowRight,
  Receipt,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { startPaystackCheckout, verifyPaystackReference } from '@/lib/services/paystack-client';

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Handle Paystack callback on redirect
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const status = searchParams.get('status');

    if (reference) {
      setVerifying(true);
      verifyPaystackReference(reference)
        .then((res) => {
          if (res.success) {
            setVerificationSuccess(
              `Payment verified successfully! Reference: ${reference}. Your subscription is now active.`
            );
            toast({
              title: "Payment Successful",
              description: `Your ${res.data?.planId || 'subscription'} has been successfully activated.`,
            });
          } else {
            setVerificationError(
              res.error?.message || "Payment verification failed. Please contact support."
            );
            toast({
              title: "Verification Failed",
              description: res.error?.message || "Could not verify payment reference.",
              variant: "destructive",
            });
          }
        })
        .catch((err) => {
          setVerificationError(err.message || "Failed to verify payment reference.");
        })
        .finally(() => {
          setVerifying(false);
          // Clean up search params
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('reference');
          newParams.delete('trxref');
          newParams.delete('status');
          setSearchParams(newParams, { replace: true });
        });
    }
  }, [searchParams, setSearchParams]);

  // Handle plan checkout
  const handleCheckout = async (planId: string) => {
    if (planId === 'starter') {
      toast({
        title: "Free Starter Tier",
        description: "You are already active on the Community Explorer / Starter tier.",
      });
      return;
    }

    const email = user?.email || prompt("Enter your billing email for Paystack receipt:") || "";
    if (!email || !email.includes("@")) {
      toast({
        title: "Valid Email Required",
        description: "Please provide a valid email address to proceed with Paystack checkout.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCheckoutLoading(planId);
      await startPaystackCheckout({
        email,
        planId,
        billingCycle,
        currency: "USD",
        onSuccess: (ref) => {
          setVerificationSuccess(`Payment completed! Reference: ${ref}. Subscription activated.`);
          toast({
            title: "Payment Approved",
            description: `Paystack transaction ${ref} was successful.`,
          });
          setCheckoutLoading(null);
        },
        onCancel: () => {
          setCheckoutLoading(null);
          toast({
            title: "Checkout Cancelled",
            description: "Payment was not completed.",
          });
        },
      });
    } catch (err: any) {
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to initiate Paystack checkout.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Mock data
  const currentPlan = {
    name: 'Professional',
    price: billingCycle === 'annual' ? 39 : 49,
    period: 'month',
    nextBilling: 'February 15, 2026',
    status: 'active'
  };

  const usage = {
    aiRequests: { current: 2350, limit: 10000, percentage: 23.5 },
    deployments: { current: 45, limit: 200, percentage: 22.5 },
    securityScans: { current: 28, limit: 100, percentage: 28 },
    storage: { current: 45.2, limit: 100, percentage: 45.2 },
    teamMembers: { current: 8, limit: 25, percentage: 32 }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      period: 'month',
      description: 'Perfect for individuals and small projects',
      features: [
        '1,000 AI requests/month',
        '10 deployments/month',
        '20 security scans/month',
        '5 GB storage',
        '3 team members',
        'Community support'
      ],
      highlighted: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 49,
      period: 'month',
      description: 'Best for growing teams and businesses',
      features: [
        '10,000 AI requests/month',
        '200 deployments/month',
        '100 security scans/month',
        '100 GB storage',
        '25 team members',
        'Priority support',
        'Advanced analytics',
        'Custom integrations'
      ],
      highlighted: true,
      badge: 'Most Popular'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      period: 'month',
      description: 'For large organizations with custom needs',
      features: [
        'Unlimited AI requests',
        'Unlimited deployments',
        '500 security scans/month',
        '1 TB storage',
        'Unlimited team members',
        '24/7 dedicated support',
        'Custom SLAs',
        'On-premise deployment',
        'SSO & SAML',
        'Audit logs'
      ],
      highlighted: false
    }
  ];

  const invoices = [
    { id: 'INV-2026-001', date: 'January 15, 2026', amount: 49.00, status: 'paid' },
    { id: 'INV-2025-012', date: 'December 15, 2025', amount: 49.00, status: 'paid' },
    { id: 'INV-2025-011', date: 'November 15, 2025', amount: 49.00, status: 'paid' },
    { id: 'INV-2025-010', date: 'October 15, 2025', amount: 49.00, status: 'paid' },
    { id: 'INV-2025-009', date: 'September 15, 2025', amount: 49.00, status: 'paid' },
    { id: 'INV-2025-008', date: 'August 15, 2025', amount: 29.00, status: 'paid' },
  ];

  const paymentMethods = [
    { id: 1, type: 'visa', last4: '4242', expiry: '12/2027', isDefault: true },
    { id: 2, type: 'mastercard', last4: '5555', expiry: '06/2026', isDefault: false }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Verification Alert Banners */}
        {verifying && (
          <Alert className="border-blue-500/50 bg-white/5 text-white">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <AlertTitle>Verifying Paystack Transaction</AlertTitle>
            <AlertDescription>
              Please wait while we confirm your payment reference and activate your subscription...
            </AlertDescription>
          </Alert>
        )}

        {verificationSuccess && (
          <Alert className="border-green-500/50 bg-[#00ff41]/80/10 text-[#00ff41]">
            <CheckCircle className="w-4 h-4 text-[#00ff41]" />
            <AlertTitle>Subscription Active</AlertTitle>
            <AlertDescription>{verificationSuccess}</AlertDescription>
          </Alert>
        )}

        {verificationError && (
          <Alert className="border-zinc-600 bg-zinc-900/80 text-zinc-400">
            <AlertCircle className="w-4 h-4 text-zinc-400" />
            <AlertTitle>Payment Verification Error</AlertTitle>
            <AlertDescription>{verificationError}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[10px] font-bold">Billing & Subscription</h1>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                <Lock className="w-3 h-3 mr-1" /> Paystack Secured
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your subscription, view usage, and upgrade your intelligence tier via Paystack
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Billing Data
          </Button>
        </div>

        {/* Current Plan Overview */}
        <Card className="border-primary/30 bg-gradient-to-r from-card to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[10px] font-bold">{currentPlan.name} Plan</h2>
                    <Badge className="bg-[#00ff41]/80">Active</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    ${currentPlan.price}/month • Next billing: {currentPlan.nextBilling}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => handleCheckout('enterprise')}>
                  <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Enterprise
                </Button>
                <Button variant="outline" className="text-zinc-400 hover:text-zinc-400">
                  Cancel Subscription
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <DollarSign className="w-8 h-8 text-[#00ff41] mb-2" />
                  <p className="text-[10px] font-bold">${currentPlan.price}</p>
                  <p className="text-[10px] text-muted-foreground">Monthly cost</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Calendar className="w-8 h-8 text-white mb-2" />
                  <p className="text-[10px] font-bold">Feb 15</p>
                  <p className="text-[10px] text-muted-foreground">Next billing</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Receipt className="w-8 h-8 text-white mb-2" />
                  <p className="text-[10px] font-bold">${invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Total paid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <TrendingUp className="w-8 h-8 text-[#00ff41] mb-2" />
                  <p className="text-[10px] font-bold">23.5%</p>
                  <p className="text-[10px] text-muted-foreground">Usage</p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Current Usage Summary</CardTitle>
                <CardDescription>Your resource consumption this billing period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-medium">AI Requests</span>
                      </div>
                      <span className="text-[10px]">{usage.aiRequests.current.toLocaleString()} / {usage.aiRequests.limit.toLocaleString()}</span>
                    </div>
                    <Progress value={usage.aiRequests.percentage} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{usage.aiRequests.percentage}% used</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-medium">Deployments</span>
                      </div>
                      <span className="text-[10px]">{usage.deployments.current} / {usage.deployments.limit}</span>
                    </div>
                    <Progress value={usage.deployments.percentage} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{usage.deployments.percentage}% used</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-zinc-400" />
                        <span className="text-[10px] font-medium">Security Scans</span>
                      </div>
                      <span className="text-[10px]">{usage.securityScans.current} / {usage.securityScans.limit}</span>
                    </div>
                    <Progress value={usage.securityScans.percentage} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{usage.securityScans.percentage}% used</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-zinc-300" />
                        <span className="text-[10px] font-medium">Storage</span>
                      </div>
                      <span className="text-[10px]">{usage.storage.current} GB / {usage.storage.limit} GB</span>
                    </div>
                    <Progress value={usage.storage.percentage} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{usage.storage.percentage}% used</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#00ff41]" />
                        <span className="text-[10px] font-medium">Team Members</span>
                      </div>
                      <span className="text-[10px]">{usage.teamMembers.current} / {usage.teamMembers.limit}</span>
                    </div>
                    <Progress value={usage.teamMembers.percentage} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{usage.teamMembers.percentage}% used</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Your latest billing history</CardDescription>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-[10px] text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium">${invoice.amount.toFixed(2)}</p>
                        <Badge className="bg-green-100 text-[#00ff41] dark:bg-green-900/30 dark:text-[#00ff41]">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Paid
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Usage Breakdown</CardTitle>
                <CardDescription>Monitor your resource consumption in detail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {Object.entries(usage).map(([key, data]) => {
                  const icons: Record<string, any> = {
                    aiRequests: Bot,
                    deployments: Code,
                    securityScans: Shield,
                    storage: Zap,
                    teamMembers: Users
                  };
                  const Icon = icons[key];
                  const labels: Record<string, string> = {
                    aiRequests: 'AI Requests',
                    deployments: 'Deployments',
                    securityScans: 'Security Scans',
                    storage: 'Storage (GB)',
                    teamMembers: 'Team Members'
                  };

                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{labels[key]}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {data.current.toLocaleString()} of {data.limit.toLocaleString()} used
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold">{data.percentage}%</p>
                          <p className="text-[10px] text-muted-foreground">
                            {data.limit - data.current} remaining
                          </p>
                        </div>
                      </div>
                      <Progress value={data.percentage} className="h-3" />
                      {data.percentage > 80 && (
                        <div className="flex items-center gap-2 text-zinc-300">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px]">Approaching limit - consider upgrading</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
              <h3 className="text-[10px] font-bold">Select Subscription Tier</h3>
              <p className="text-[10px] text-muted-foreground max-w-md">
                All subscriptions are processed securely via Paystack with instant activation and cryptographic audit verification.
              </p>
              {/* Billing Toggle */}
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className={billingCycle === 'monthly' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                  Monthly Billing
                </span>
                <button
                  type="button"
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                  className="w-12 h-6 rounded-full border border-primary/30 bg-muted p-0.5 relative transition-colors"
                >
                  <div
                    className={`size-4.5 rounded-full bg-primary transition-transform ${
                      billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className={billingCycle === 'annual' ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                    Annual Billing
                  </span>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-[10px]">
                    SAVE 20%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const planPrice =
                  plan.price === 0
                    ? 0
                    : billingCycle === 'annual'
                    ? Math.round(plan.price * 0.8)
                    : plan.price;

                const isCurrent = plan.id === 'professional';
                const isLoading = checkoutLoading === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col justify-between ${
                      plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">{plan.badge}</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-[10px]">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div>
                          <span className="text-4xl font-bold">${planPrice}</span>
                          <span className="text-muted-foreground">/{plan.period}</span>
                        </div>
                        {billingCycle === 'annual' && planPrice > 0 && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Billed annually (${planPrice * 12}/yr)
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2.5 text-left text-[10px] flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#00ff41] flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={plan.id === 'professional' ? 'default' : 'outline'}
                        className="w-full mt-4"
                        disabled={isLoading || isCurrent}
                        onClick={() => handleCheckout(plan.id)}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting Paystack...
                          </>
                        ) : isCurrent ? (
                          'Current Active Tier'
                        ) : plan.id === 'starter' ? (
                          'Active Free Tier'
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Pay with Paystack (${planPrice})
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>Download and view your past invoices</CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-[10px] text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-[10px] font-bold">${invoice.amount.toFixed(2)}</p>
                        <Badge className="bg-green-100 text-[#00ff41] dark:bg-green-900/30 dark:text-[#00ff41]">
                          Paid
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">View</Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your payment methods</CardDescription>
                </div>
                <Button>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{method.type}</p>
                            <p className="text-muted-foreground">•••• {method.last4}</p>
                            {method.isDefault && <Badge variant="outline">Default</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Expires {method.expiry}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Edit</Button>
                        {!method.isDefault && (
                          <Button variant="ghost" size="sm" className="text-zinc-400">Remove</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
                <CardDescription>Your billing address for invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg">
                  <p className="font-medium">FeexSystems Labs</p>
                  <p className="text-muted-foreground">123 Innovation Drive</p>
                  <p className="text-muted-foreground">San Francisco, CA 94105</p>
                  <p className="text-muted-foreground">United States</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Update Address
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}