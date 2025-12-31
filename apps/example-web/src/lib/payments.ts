import { createPaymentService } from "@projectfe/payments";

import { env } from "~/env";

/**
 * Initialize and configure the payment service with providers
 */
export function initializePaymentService() {
  const paymentService = createPaymentService();

  // Register NowPayments if configured
  if (env.NOWPAYMENTS_API_KEY) {
    paymentService.registerNowPayments({
      apiKey: env.NOWPAYMENTS_API_KEY,
      ipnSecret: env.NOWPAYMENTS_IPN_SECRET,
      sandboxMode: env.NOWPAYMENTS_SANDBOX_MODE,
    });
  }

  // Register PayPal if configured
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    paymentService.registerPayPal({
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      webhookId: env.PAYPAL_WEBHOOK_ID,
      sandboxMode: env.PAYPAL_SANDBOX_MODE,
    });
  }

  return paymentService;
}

// Singleton instance
let paymentServiceInstance: ReturnType<typeof createPaymentService> | null =
  null;

/**
 * Get the initialized payment service instance
 */
export function getPaymentServiceInstance() {
  paymentServiceInstance ??= initializePaymentService();
  return paymentServiceInstance;
}
