import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type {
  NowPaymentsIPNPayload,
  WebhookVerificationResult,
} from "@projectfe/payments";
import { NowPaymentsProvider } from "@projectfe/payments";

import { env } from "~/env";

// Initialize the NowPayments provider
const provider = new NowPaymentsProvider();

// Use validated env vars from ~/env
const NOWPAYMENTS_API_KEY = env.NOWPAYMENTS_API_KEY ?? "";
const NOWPAYMENTS_IPN_SECRET = env.NOWPAYMENTS_IPN_SECRET;
const IS_PRODUCTION = env.NODE_ENV === "production";

if (NOWPAYMENTS_API_KEY) {
  provider.initialize({
    apiKey: NOWPAYMENTS_API_KEY,
    webhookSecret: NOWPAYMENTS_IPN_SECRET,
    sandboxMode: !IS_PRODUCTION,
  });
}

/**
 * @swagger
 * /api/webhooks/nowpayments:
 *   post:
 *     summary: NowPayments IPN Webhook Handler
 *     description: Receive and process payment status updates from NowPayments
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NowPaymentsWebhookPayload'
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Get headers for signature verification
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Verify webhook signature and parse payload

    const verificationResult: WebhookVerificationResult =
      await provider.verifyWebhook(body, headers);

    if (!verificationResult.valid) {
      const errorMsg = verificationResult.error ?? "Invalid webhook signature";
      console.error("NowPayments webhook verification failed:", errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    const webhookEvent = verificationResult.event;
    if (!webhookEvent) {
      return NextResponse.json(
        { error: "No webhook event found" },
        { status: 400 },
      );
    }

    const payload = webhookEvent.rawPayload as NowPaymentsIPNPayload;

    // Log the webhook for debugging

    console.log("NowPayments webhook received:", {
      paymentId: payload.payment_id,
      status: payload.payment_status,
      amount: payload.actually_paid,
      currency: payload.pay_currency,
      purchaseId: payload.purchase_id,
    });

    // Handle different payment statuses
    switch (payload.payment_status) {
      case "finished":
        handleFinishedPayment(payload);
        break;

      case "failed":
        handleFailedPayment(payload);
        break;

      case "expired":
        handleExpiredPayment(payload);
        break;

      case "partially_paid":
        handlePartiallyPaidPayment(payload);
        break;

      case "refunded":
        handleRefundedPayment(payload);
        break;

      case "waiting":
      case "confirming":
      case "confirmed":
      case "sending":
        // These are intermediate statuses, just log them
        console.log(
          `Payment ${payload.payment_id} is ${payload.payment_status}`,
        );
        break;

      default:
        console.warn(`Unknown payment status: ${payload.payment_status}`);
    }

    // Always return 200 OK to acknowledge receipt
    console.log("Webhook processed successfully");
    return NextResponse.json({
      status: "received",
      processed: true,
    });
  } catch (error) {
    console.error("Error processing NowPayments webhook:", error);

    // Return error response
    return NextResponse.json(
      {
        status: "received",
        processed: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

/**
 * Handle successful payment completion
 */
function handleFinishedPayment(payload: NowPaymentsIPNPayload): void {
  console.log("Payment finished:", {
    paymentId: payload.payment_id,
    purchaseId: payload.purchase_id,
    amountPaid: payload.actually_paid,
    currency: payload.pay_currency,
    outcomeAmount: payload.outcome_amount,
    outcomeCurrency: payload.outcome_currency,
    fees: payload.fee,
  });

  // TODO: Update your database
  // - Mark payment as completed
  // - Update user balance or credits
  // - Fulfill the order
  // - Send confirmation email

  // Example:
  // await db.payments.update({
  //   where: { purchaseId: payload.purchase_id },
  //   data: {
  //     status: 'completed',
  //     completedAt: new Date(),
  //     actuallyPaid: payload.actually_paid,
  //     currency: payload.pay_currency,
  //     outcomeAmount: payload.outcome_amount,
  //     fees: payload.fee ? JSON.stringify(payload.fee) : null,
  //   },
  // });

  // Calculate net amount (after fees)
  if (payload.fee) {
    const totalFee =
      (payload.fee.depositFee ?? 0) +
      (payload.fee.withdrawalFee ?? 0) +
      (payload.fee.serviceFee ?? 0);
    console.log(`Total fees: ${totalFee} ${payload.fee.currency}`);
    console.log(
      `Net amount: ${payload.outcome_amount ?? 0} ${payload.outcome_currency ?? ""}`,
    );
  }
}

/**
 * Handle failed payment
 */
function handleFailedPayment(payload: NowPaymentsIPNPayload): void {
  console.log("Payment failed:", {
    paymentId: payload.payment_id,
    purchaseId: payload.purchase_id,
  });

  // TODO: Update your database
  // - Mark payment as failed
  // - Notify user
  // - Clean up any pending orders

  // Example:
  // await db.payments.update({
  //   where: { purchaseId: payload.purchase_id },
  //   data: {
  //     status: 'failed',
  //     failedAt: new Date(),
  //   },
  // });
}

/**
 * Handle expired payment
 */
function handleExpiredPayment(payload: NowPaymentsIPNPayload): void {
  console.log("Payment expired:", {
    paymentId: payload.payment_id,
    purchaseId: payload.purchase_id,
  });

  // TODO: Update your database
  // - Mark payment as expired
  // - Clean up pending orders
  // - Notify user if needed
}

/**
 * Handle partially paid payment
 */
function handlePartiallyPaidPayment(payload: NowPaymentsIPNPayload): void {
  console.log("Payment partially paid:", {
    paymentId: payload.payment_id,
    purchaseId: payload.purchase_id,
    expected: payload.pay_amount,
    received: payload.actually_paid,
    difference: (payload.pay_amount ?? 0) - (payload.actually_paid ?? 0),
  });

  // TODO: Decide how to handle partial payments
  // - Accept and provide partial service
  // - Request additional payment
  // - Refund the partial payment
}

/**
 * Handle refunded payment
 */
function handleRefundedPayment(payload: NowPaymentsIPNPayload): void {
  console.log("Payment refunded:", {
    paymentId: payload.payment_id,
    purchaseId: payload.purchase_id,
    amount: payload.actually_paid,
  });

  // TODO: Update your database
  // - Mark payment as refunded
  // - Reverse any credits or services provided
  // - Notify user
  // - Update accounting records
}
