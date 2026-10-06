 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express, { } from "express";
import { paystackService } from "../lib/services/paystack.service";


const router = express.Router();

/**
 * GET /api/paystack/config
 * Returns public configuration and supported plans
 */
router.get("/config", (_req, res) => {
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
router.post("/initialize", async (req, res) => {
  try {
    const {
      email,
      planId = "engineer_pro_monthly",
      billingCycle = "monthly",
      currency = "USD",
      callbackUrl,
    } = req.body;

    // Resolve user details (optional auth for seamless checkout)
    const user = (req ).user;
    const targetEmail = email || _optionalChain([user, 'optionalAccess', _ => _.email]);

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
        userId: _optionalChain([user, 'optionalAccess', _2 => _2.id]),
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
router.get("/verify/:reference", async (req, res) => {
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
      const user = (req ).user;
      const userId = _optionalChain([user, 'optionalAccess', _3 => _3.id]) || (_optionalChain([result, 'access', _4 => _4.metadata, 'optionalAccess', _5 => _5.userId]) );
      const planId = (_optionalChain([result, 'access', _6 => _6.metadata, 'optionalAccess', _7 => _7.planId]) ) || "engineer_pro_monthly";

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
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"] ;
  const rawBody = (req ).rawBody || JSON.stringify(req.body);

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
