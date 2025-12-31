import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPaymentServiceInstance } from "~/lib/payments";

/**
 * @swagger
 * /api/webhooks/logs:
 *   get:
 *     summary: Get webhook logs
 *     description: Retrieve webhook logs for debugging
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema: {type: string, enum: [nowpayments, paypal]}
 *       - in: query
 *         name: transactionId
 *         schema: {type: integer}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, default: 50, maximum: 500}
 *     responses:
 *       200:
 *         description: Webhook logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs: {type: array, items: {type: object}}
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as
      | "nowpayments"
      | "paypal"
      | null;
    const transactionId = searchParams.get("transactionId");
    const limit = searchParams.get("limit");

    const paymentService = getPaymentServiceInstance();
    const logs = await paymentService.getWebhookLogs({
      provider: provider ?? undefined,
      transactionId: transactionId ? parseInt(transactionId, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get webhook logs error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get webhook logs", message },
      { status: 500 },
    );
  }
}
