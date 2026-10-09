import express, { Request, Response } from "express";
import { paystackService } from "../lib/services/paystack.service";
import "../lib/middleware/auth.middleware";

const router = express.Router();

/**
 * GET /api/paystack/config
 * Returns public configuration and supported plans
 */
router.get("/config", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publicKey: paystackService.getPublicKey(),
      isLive: true,
      supportedCurrencies: ["USD", "NGN", "GHS", "ZAR"],
      plans: [
        {
          id: "community",
          name: "Community Explorer",
          price: 0,
          currency: "USD",
          interval: "month",
        },
        {
          id: "engineer_pro_monthly",
          name: "Engineer Pro (Monthly)",
          price: 29,
          currency: "USD",
          interval: "month",
        },
        {
          id: "engineer_pro_annual",
          name: "Engineer Pro (Annual)",
          price: 240,
          currency: "USD",
          interval: "year",
        },
        {
          id: "enterprise_sovereign",
          name: "Enterprise Sovereign",
          price: 290,
          currency: "USD",
          interval: "month",
        },
      ],
    },
  });
});

/**
 * POST /api/paystack/initialize
 * Initialize transaction for subscription or one-time payment
 */
router.post("/initialize", async (req: Request, res: Response) => {
  try {
    const {
      email,
      planId = "engineer_pro_monthly",
      billingCycle = "monthly",
      currency = "USD",
      callbackUrl,
    } = req.body;

    // Resolve user details (optional auth for seamless checkout)
    const user = (req as any).user;
    const targetEmail = email || user?.email;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMAIL_REQUIRED",
          message: "Email is required to initialize Paystack checkout",
        },
      });
    }

    // Determine amount in USD cents
    let amountInCents = 2900; // default $29
    if (planId === "engineer_pro_annual" || billingCycle === "annual") {
      amountInCents = 24000; // $240 / year
    } else if (planId === "enterprise_sovereign") {
      amountInCents = 29000; // $290 / month
    } else if (planId === "community") {
      amountInCents = 0;
    }

    if (amountInCents === 0) {
      return res.json({
        success: true,
        data: {
          authorizationUrl: callbackUrl || "/dashboard/billing?status=success&tier=community",
          accessCode: "FREE_TIER",
          reference: `free_${Date.now()}`,
          publicKey: paystackService.getPublicKey(),
        },
      });
    }

    const host = req.get("host") || "feexsystems.codes";
    const protocol = req.protocol === "https" || host.includes("feexsystems.codes") ? "https" : "http";
    const defaultCallback = `${protocol}://${host}/dashboard/billing?status=success`;

    const result = await paystackService.initializeTransaction({
      email: targetEmail,
      amount: amountInCents,
      currency,
      callbackUrl: callbackUrl || defaultCallback,
      metadata: {
        userId: user?.id,
        userEmail: targetEmail,
        planId,
        billingCycle,
      },
    });

    res.json({
      success: true,
      data: {
        ...result,
        publicKey: paystackService.getPublicKey(),
      },
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "PAYSTACK_INIT_FAILED",
        message: error instanceof Error ? error.message : "Failed to initialize payment",
      },
    });
  }
});

/**
 * GET /api/paystack/verify/:reference
 * Verify transaction and activate subscription
 */
router.get("/verify/:reference", async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: {
          code: "REFERENCE_REQUIRED",
          message: "Transaction reference is required",
        },
      });
    }

    const result = await paystackService.verifyTransaction(reference);

    if (result.status === "success") {
      const user = (req as any).user;
      const userId = user?.id || (result.metadata?.userId as string);
      const planId = (result.metadata?.planId as string) || "engineer_pro_monthly";

      if (userId) {
        await paystackService.activateSubscriptionFromPayment(userId, planId, reference);
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Paystack verification error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "PAYSTACK_VERIFY_FAILED",
        message: error instanceof Error ? error.message : "Failed to verify transaction",
      },
    });
  }
});

/**
 * POST /api/paystack/webhook
 * Paystack Webhook Receiver with HMAC-SHA512 Verification
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["x-paystack-signature"] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  if (!signature || !paystackService.verifyWebhookSignature(signature, rawBody)) {
    console.warn("⚠️ Invalid Paystack webhook signature rejected");
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  try {
    const result = await paystackService.handleWebhookEvent(req.body);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Paystack webhook processing error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook handler failed",
    });
  }
});

export default router;
