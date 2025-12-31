import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";

/**
 * Helper function to sort object keys alphabetically (required by NowPayments)
 */
function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, unknown>, key: string) => {
      const value = obj[key];
      result[key] =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? sortObject(value as Record<string, unknown>)
          : value;
      return result;
    }, {});
}

/**
 * @swagger
 * /api/webhooks/sign:
 *   post:
 *     summary: Generate webhook signature for testing
 *     description: Generate HMAC-SHA512 signature for NowPayments webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payload]
 *             properties:
 *               payload: {type: object, additionalProperties: true}
 *     responses:
 *       200:
 *         description: Signature generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signature: {type: string}
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const { payload } = body as { payload?: Record<string, unknown> };

    if (!payload) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Get IPN secret from environment
    const ipnSecret = env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
      console.error("NOWPAYMENTS_IPN_SECRET is not set");
      return NextResponse.json(
        { error: "IPN secret not configured" },
        { status: 500 },
      );
    }

    // Sort payload keys alphabetically (NowPayments requirement)
    const sortedPayload = sortObject(payload);
    const payloadString = JSON.stringify(sortedPayload);

    // Generate HMAC-SHA512 signature
    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(payloadString);
    const signature = hmac.digest("hex");

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Error generating signature:", error);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 },
    );
  }
}
