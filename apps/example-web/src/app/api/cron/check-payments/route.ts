import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { env } from "~/env";
import { getPaymentServiceInstance } from "~/lib/payments";

const CheckPendingBodySchema = z.object({
  provider: z.enum(["nowpayments", "paypal"]).optional(),
  olderThanMinutes: z.number().min(1).max(60).optional(),
  limit: z.number().min(1).max(100).optional(),
});

/**
 * @swagger
 * /api/cron/check-payments:
 *   post:
 *     summary: Check pending payment statuses (Cron Job)
 *     description: Periodic job to check and update pending payments. Requires CRON_SECRET authorization.
 *     tags: [Cron]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider: {type: string, enum: [nowpayments, paypal]}
 *               olderThanMinutes: {type: number, minimum: 1, maximum: 60, default: 5}
 *               limit: {type: number, minimum: 1, maximum: 100, default: 100}
 *     responses:
 *       200:
 *         description: Cron job completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: {type: string, example: ok}
 *                 checked: {type: integer}
 *                 updated: {type: integer}
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    // TODO: Migrate to more secure method (e.g., signed requests) in the future (IMPORTANT)
    const cronSecret = env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => ({}));
    const query = CheckPendingBodySchema.parse(body);

    const paymentService = getPaymentServiceInstance();
    const result = await paymentService.checkPendingPayments({
      provider: query.provider,
      olderThanMinutes: query.olderThanMinutes ?? 5,
      limit: query.limit ?? 100,
    });

    console.log("Cron job completed:", result);

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    console.error("Cron job error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Cron job failed", message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/check-payments
 * Trigger check manually (for testing)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as
    | "nowpayments"
    | "paypal"
    | null;

  const paymentService = getPaymentServiceInstance();
  const result = await paymentService.checkPendingPayments({
    provider: provider ?? undefined,
    olderThanMinutes: 1, // More aggressive for manual testing
    limit: 10,
  });

  return NextResponse.json({
    status: "ok",
    ...result,
  });
}
