import { PaystackInitializeResponse } from "@shared/api";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email?: string;
        amount?: number;
        currency?: string;
        ref?: string;
        access_code?: string;
        callback?: (response: { reference: string; status: string }) => void;
        onClose?: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Loads Paystack Inline script dynamically
 */
export async function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.PaystackPop) return true;

  return new Promise((resolve) => {
    const existing = document.getElementById("paystack-inline-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Could not load Paystack inline script, will fallback to redirect.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initialize and open Paystack checkout flow
 */
export async function startPaystackCheckout(options: {
  email: string;
  planId: string;
  billingCycle?: "monthly" | "annual";
  currency?: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}): Promise<void> {
  const {
    email,
    planId,
    billingCycle = "monthly",
    currency = "USD",
    onSuccess,
    onCancel,
  } = options;

  // 1. Call server endpoint to initialize transaction
  const response = await fetch("/api/paystack/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      planId,
      billingCycle,
      currency,
      callbackUrl: `${window.location.origin}/dashboard/billing?status=success&planId=${planId}`,
    }),
  });

  const json: PaystackInitializeResponse = await response.json();

  if (!json.success || !json.data) {
    throw new Error(
      (json as any).error?.message || "Failed to initialize Paystack checkout"
    );
  }

  const { authorizationUrl, accessCode, reference, publicKey } = json.data;

  // 2. Try Paystack Popup first for seamless experience
  const scriptLoaded = await loadPaystackScript();

  if (scriptLoaded && window.PaystackPop && accessCode && accessCode !== "FREE_TIER") {
    const handler = window.PaystackPop.setup({
      key: publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      access_code: accessCode,
      callback: (res) => {
        if (onSuccess) {
          onSuccess(res.reference || reference);
        } else {
          window.location.href = `/dashboard/billing?status=success&reference=${res.reference || reference}`;
        }
      },
      onClose: () => {
        if (onCancel) onCancel();
      },
    });

    handler.openIframe();
    return;
  }

  // 3. Fallback to hosted redirect URL
  if (authorizationUrl) {
    window.location.href = authorizationUrl;
  }
}

/**
 * Verify transaction reference after return
 */
export async function verifyPaystackReference(reference: string) {
  const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
  return await res.json();
}
