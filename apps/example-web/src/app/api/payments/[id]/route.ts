import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPaymentServiceInstance } from "~/lib/payments";

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     description: Retrieve detailed information about a specific payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *       - in: query
 *         name: refresh
 *         schema: {type: boolean, default: false}
 *         description: Force refresh from provider
 *     responses:
 *       200:
 *         description: Payment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const transactionId = parseInt(id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const paymentService = getPaymentServiceInstance();

    const status = await paymentService.getPaymentStatus(
      { transactionId },
      { refreshFromProvider: refresh },
    );

    // Return only the fields needed by frontend to avoid zod validation issues
    // with null values in providerData
    return NextResponse.json({
      transactionId: status.transactionId,
      externalId: status.externalId,
      status: status.status,
      payAddress: status.payAddress,
      payCurrency: status.payCurrency,
      payAmount: status.payAmount,
      invoiceUrl: status.invoiceUrl,
      requestedAmount: status.requestedAmount,
      requestedCurrency: status.requestedCurrency,
      receivedAmount: status.receivedAmount,
      receivedCurrency: status.receivedCurrency,
      confirmedAt: status.confirmedAt,
      completedAt: status.completedAt,
      expiresAt: status.expiresAt,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Get payment status error:", error);

    if (error.message === "Payment not found") {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to get payment status", message: error.message },
      { status: 500 },
    );
  }
}
