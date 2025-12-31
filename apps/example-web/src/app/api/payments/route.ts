import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { getPaymentServiceInstance } from "~/lib/payments";

const CreatePaymentSchema = z.object({
  provider: z.enum(["nowpayments", "paypal"]),
  amount: z.number().positive(),
  currency: z.string().min(3).max(10),
  payCurrency: z.string().optional(),
  orderId: z.string().optional(),
  orderDescription: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  ipnCallbackUrl: z.string().url().optional(),
  userId: z.number().optional(),
  projectId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Initiate a payment transaction with a specified provider
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema: {type: string}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const validated = CreatePaymentSchema.parse(body);

    const paymentService = getPaymentServiceInstance();

    // Generate idempotency key if not provided
    const idempotencyKey =
      request.headers.get("X-Idempotency-Key") ??
      `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log({
      idempotencyKey,
      amount: validated.amount,
      currency: validated.currency,
      type: "one_time",
      payCurrency: validated.payCurrency,
      orderId: validated.orderId,
      orderDescription: validated.orderDescription,
      successUrl: validated.successUrl,
      cancelUrl: validated.cancelUrl,
      ipnCallbackUrl: validated.ipnCallbackUrl,
      userId: validated.userId,
      projectId: validated.projectId,
      metadata: validated.metadata,
    });

    const result = await paymentService.createPayment(validated.provider, {
      idempotencyKey,
      amount: validated.amount,
      currency: validated.currency,
      type: "one_time",
      payCurrency: validated.payCurrency,
      orderId: validated.orderId,
      orderDescription: validated.orderDescription,
      successUrl: validated.successUrl,
      cancelUrl: validated.cancelUrl,
      ipnCallbackUrl: validated.ipnCallbackUrl,
      userId: validated.userId,
      projectId: validated.projectId,
      metadata: validated.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error("Payment creation error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.issues },
        { status: 400 },
      );
    }

    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create payment", message: errorMessage },
      { status: 500 },
    );
  }
}

const GetPaymentsQuerySchema = z.object({
  provider: z.enum(["nowpayments", "paypal"]).optional(),
  status: z
    .enum([
      "pending",
      "confirming",
      "confirmed",
      "sending",
      "partially_paid",
      "finished",
      "failed",
      "refunded",
      "expired",
    ])
    .optional(),
  projectId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: List all payments
 *     description: Retrieve payments with optional filtering and pagination
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema: {type: string, enum: [nowpayments, paypal]}
 *       - in: query
 *         name: status
 *         schema: {type: string}
 *       - in: query
 *         name: projectId
 *         schema: {type: string}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, default: 10}
 *       - in: query
 *         name: offset
 *         schema: {type: integer, default: 0}
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = GetPaymentsQuerySchema.parse({
      provider: searchParams.get("provider") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const paymentService = getPaymentServiceInstance();
    const payments = await paymentService.getPayments(query);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Get payments error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get payments", message },
      { status: 500 },
    );
  }
}
