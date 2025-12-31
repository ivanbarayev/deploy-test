import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPaymentServiceInstance } from "~/lib/payments";

/**
 * @swagger
 * /api/callbacks/paypal:
 *   post:
 *     summary: PayPal Webhook Handler
 *     description: Receive and process PayPal webhook notifications
 *     tags: [Callbacks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: {type: string}
 *               event_type: {type: string}
 *               resource: {type: object}
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: {type: string, enum: [ok, received, error]}
 *                 processed: {type: boolean}
 *                 transactionId: {type: number}
 *                 paymentStatus: {type: string}
 *   get:
 *     summary: Health check for PayPal webhook
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
 *                 provider: {type: string, example: paypal}
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
      "paypal",
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
      console.warn("PayPal webhook not processed:", webhookResult.error);
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

    console.log("PayPal webhook processed successfully:", {
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
    console.error("PayPal webhook error:", err);

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
    provider: "paypal",
    message: "PayPal webhook endpoint is active",
  });
}
