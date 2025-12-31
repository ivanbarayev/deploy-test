import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPaymentServiceInstance } from "~/lib/payments";

/**
 * @swagger
 * /api/callbacks/nowpayments:
 *   post:
 *     summary: NowPayments Webhook Callback Handler
 *     description: Alternative webhook endpoint for NowPayments payment notifications
 *     tags: [Callbacks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NowPaymentsWebhookPayload'
 *     responses:
 *       200:
 *         description: Webhook processed or received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: {type: string, enum: [ok, received, error]}
 *                 processed: {type: boolean}
 *                 transactionId: {type: number}
 *                 paymentStatus: {type: string}
 *                 error: {type: string}
 *   get:
 *     summary: Health check for NowPayments webhook
 *     description: Verify webhook endpoint is active
 *     tags: [Callbacks]
 *     responses:
 *       200:
 *         description: Webhook endpoint is active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: {type: string, example: ok}
 *                 provider: {type: string, example: nowpayments}
 *                 message: {type: string}
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Get headers for signature verification
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Get source IP
    const sourceIp =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const paymentService = getPaymentServiceInstance();

    const webhookResult = await paymentService.processWebhook(
      "nowpayments",
      rawBody,
      headers,
      sourceIp,
    );

    // Type assertions
    interface ProcessedResult {
      processed: true;
      transaction?: { id?: number; status?: string };
      event?: { eventType?: string };
    }

    if (!webhookResult.processed) {
      console.warn("NowPayments webhook not processed:", webhookResult.error);
      // Return 200 to acknowledge receipt even if not processed
      // This prevents unnecessary retries for known issues
      return NextResponse.json(
        {
          status: "received",
          processed: false,
          error: webhookResult.error,
        },
        { status: 200 },
      );
    }

    const processed = webhookResult as ProcessedResult;
    const { transaction, event } = processed;

    console.log("NowPayments webhook processed successfully:", {
      transactionId: transaction?.id,
      status: transaction?.status,
      eventType: event?.eventType,
    });

    return NextResponse.json({
      status: "ok",
      processed: true,
      transactionId: transaction?.id,
      paymentStatus: transaction?.status,
    });
  } catch (error) {
    const err = error as Error;
    console.error("NowPayments webhook error:", err);

    // Return 200 to acknowledge receipt
    // Returning error codes may cause unnecessary retries
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "Unknown error",
      },
      { status: 200 },
    );
  }
}

export function GET() {
  return NextResponse.json({
    status: "ok",
    provider: "nowpayments",
    message: "NowPayments webhook endpoint is active",
  });
}
