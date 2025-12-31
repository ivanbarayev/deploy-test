# NowPayments Webhook Example

## Overview

This document provides an example of how to handle NowPayments IPN (Instant Payment Notification) webhooks in your application.

## Webhook Payload Structure

NowPayments sends a POST request to your `ipn_callback_url` with the following JSON payload:

```json
{
  "payment_id": 123456789,
  "parent_payment_id": 987654321,
  "invoice_id": null,
  "payment_status": "finished",
  "pay_address": "address",
  "payin_extra_id": null,
  "price_amount": 1,
  "price_currency": "usd",
  "pay_amount": 15,
  "actually_paid": 15,
  "actually_paid_at_fiat": 0,
  "pay_currency": "trx",
  "order_id": null,
  "order_description": null,
  "purchase_id": "123456789",
  "outcome_amount": 14.8106,
  "outcome_currency": "trx",
  "payment_extra_ids": null,
  "fee": {
    "currency": "btc",
    "depositFee": 0.09853637216235617,
    "withdrawalFee": 0,
    "serviceFee": 0
  }
}
```

## Field Descriptions

| Field                   | Type               | Description                                                                                                   |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `payment_id`            | number/string      | Unique identifier for the payment                                                                             |
| `parent_payment_id`     | number/string      | Parent payment ID (for partial payments)                                                                      |
| `invoice_id`            | number/string/null | Associated invoice ID                                                                                         |
| `payment_status`        | string             | Current status (waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired) |
| `pay_address`           | string             | Cryptocurrency address for payment                                                                            |
| `payin_extra_id`        | string/null        | Extra ID for certain cryptocurrencies (e.g., XRP destination tag)                                             |
| `price_amount`          | number             | Original price amount                                                                                         |
| `price_currency`        | string             | Original price currency (e.g., USD)                                                                           |
| `pay_amount`            | number             | Amount to be paid in crypto                                                                                   |
| `actually_paid`         | number             | Amount actually paid by the user                                                                              |
| `actually_paid_at_fiat` | number             | Fiat equivalent of actually paid amount                                                                       |
| `pay_currency`          | string             | Cryptocurrency used for payment                                                                               |
| `order_id`              | string/null        | Your custom order identifier                                                                                  |
| `order_description`     | string/null        | Description of the order                                                                                      |
| `purchase_id`           | string             | Your custom purchase identifier                                                                               |
| `outcome_amount`        | number             | Amount after fees                                                                                             |
| `outcome_currency`      | string             | Currency of the outcome amount                                                                                |
| `payment_extra_ids`     | string/null        | Additional payment identifiers                                                                                |
| `fee`                   | object             | Fee breakdown object                                                                                          |
| `fee.currency`          | string             | Currency of the fees                                                                                          |
| `fee.depositFee`        | number             | Deposit fee amount                                                                                            |
| `fee.withdrawalFee`     | number             | Withdrawal fee amount                                                                                         |
| `fee.serviceFee`        | number             | Service fee amount                                                                                            |

## Payment Statuses

- **waiting**: Waiting for payment
- **confirming**: Payment is being confirmed
- **confirmed**: Payment confirmed but not yet finished
- **sending**: Payment is being sent to your wallet
- **partially_paid**: Payment partially received
- **finished**: Payment successfully completed
- **failed**: Payment failed
- **refunded**: Payment was refunded
- **expired**: Payment expired

## Implementation Example

### 1. Using the Provider's Webhook Verification

```typescript
import type { NowPaymentsIPNPayload } from "@projectfe/payments";
import { NowPaymentsProvider } from "@projectfe/payments";

// Initialize provider
const provider = new NowPaymentsProvider();
provider.initialize({
  apiKey: process.env.NOWPAYMENTS_API_KEY!,
  webhookSecret: process.env.NOWPAYMENTS_IPN_SECRET!,
  sandboxMode: process.env.NODE_ENV !== "production",
});

// In your webhook endpoint (e.g., Next.js API route)
export async function POST(request: Request) {
  try {
    // Get the raw body and signature
    const body = await request.text();
    const signature = request.headers.get("x-nowpayments-sig");

    // Verify the webhook
    const verification = await provider.verifyWebhook(body, signature || "");

    if (!verification.isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse and validate the payload
    const payload = verification.payload as NowPaymentsIPNPayload;

    // Handle the webhook based on payment status
    switch (payload.payment_status) {
      case "finished":
        await handleSuccessfulPayment(payload);
        break;
      case "failed":
        await handleFailedPayment(payload);
        break;
      case "partially_paid":
        await handlePartialPayment(payload);
        break;
      case "refunded":
        await handleRefund(payload);
        break;
      default:
        console.log(`Payment status: ${payload.payment_status}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
}

async function handleSuccessfulPayment(payload: NowPaymentsIPNPayload) {
  console.log(`Payment ${payload.payment_id} completed`);
  console.log(`Amount paid: ${payload.actually_paid} ${payload.pay_currency}`);
  console.log(`Outcome: ${payload.outcome_amount} ${payload.outcome_currency}`);

  if (payload.fee) {
    console.log(
      `Fees: ${payload.fee.depositFee + payload.fee.withdrawalFee + payload.fee.serviceFee} ${payload.fee.currency}`,
    );
  }

  // Update your database, fulfill the order, etc.
  // Use payload.purchase_id or payload.order_id to identify the order
}

async function handleFailedPayment(payload: NowPaymentsIPNPayload) {
  console.log(`Payment ${payload.payment_id} failed`);
  // Handle failed payment (notify user, mark order as unpaid, etc.)
}

async function handlePartialPayment(payload: NowPaymentsIPNPayload) {
  console.log(`Partial payment received for ${payload.payment_id}`);
  console.log(
    `Expected: ${payload.pay_amount}, Received: ${payload.actually_paid}`,
  );
  // Handle partial payment (decide if you want to accept it or request more)
}

async function handleRefund(payload: NowPaymentsIPNPayload) {
  console.log(`Payment ${payload.payment_id} refunded`);
  // Handle refund (update order status, notify user, etc.)
}
```

### 2. Manual Webhook Validation with Zod

If you want to validate the webhook payload manually:

```typescript
import { NowPaymentsIPNPayloadSchema } from "@projectfe/payments";

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json();

    // Validate with Zod schema
    const result = NowPaymentsIPNPayloadSchema.safeParse(rawPayload);

    if (!result.success) {
      console.error("Invalid webhook payload:", result.error);
      return new Response("Invalid payload", { status: 400 });
    }

    const payload = result.data;

    // Process the validated payload
    console.log("Received webhook:", {
      paymentId: payload.payment_id,
      status: payload.payment_status,
      amount: payload.actually_paid,
      currency: payload.pay_currency,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
```

### 3. Next.js App Router Example

Create a file at `app/api/webhooks/nowpayments/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import type { NowPaymentsIPNPayload } from "@projectfe/payments";
import { db } from "@projectfe/core-db";
import { payments } from "@projectfe/core-db/schema";
import { NowPaymentsProvider } from "@projectfe/payments";

const provider = new NowPaymentsProvider();
provider.initialize({
  apiKey: process.env.NOWPAYMENTS_API_KEY!,
  webhookSecret: process.env.NOWPAYMENTS_IPN_SECRET!,
  sandboxMode: process.env.NODE_ENV !== "production",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-nowpayments-sig");

    const verification = await provider.verifyWebhook(body, signature || "");

    if (!verification.isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = verification.payload as NowPaymentsIPNPayload;

    // Update payment in database
    await db
      .update(payments)
      .set({
        status: mapNowPaymentsStatus(payload.payment_status),
        providerPaymentId: payload.payment_id,
        amountPaid: payload.actually_paid?.toString(),
        currency: payload.pay_currency,
        outcomeAmount: payload.outcome_amount?.toString(),
        outcomeCurrency: payload.outcome_currency,
        fees: payload.fee ? JSON.stringify(payload.fee) : null,
        updatedAt: new Date(),
      })
      .where(eq(payments.providerOrderId, payload.purchase_id || ""));

    // Handle completed payments
    if (payload.payment_status === "finished") {
      // Fulfill the order, send confirmation email, etc.
      await fulfillOrder(payload.purchase_id || "");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function mapNowPaymentsStatus(status: string): string {
  const statusMap: Record<string, string> = {
    waiting: "pending",
    confirming: "processing",
    confirmed: "processing",
    sending: "processing",
    finished: "completed",
    failed: "failed",
    refunded: "refunded",
    expired: "expired",
    partially_paid: "partially_paid",
  };
  return statusMap[status] || status;
}

async function fulfillOrder(purchaseId: string) {
  // Your order fulfillment logic here
  console.log(`Fulfilling order: ${purchaseId}`);
}

// Disable body parsing to get raw body for signature verification
export const dynamic = "force-dynamic";
```

## Important Notes

1. **Security**: Always verify the webhook signature using the `x-nowpayments-sig` header and your IPN secret
2. **Idempotency**: Process webhooks idempotently - you may receive the same webhook multiple times
3. **Response**: Always respond with HTTP 200 OK to acknowledge receipt
4. **Timeout**: Process webhooks quickly (under 30 seconds) or risk timeouts
5. **Logging**: Log all webhooks for debugging and auditing purposes
6. **Testing**: Use NowPayments sandbox mode for testing

## Testing Webhooks

You can test webhooks locally using tools like:

- [ngrok](https://ngrok.com/) to expose your local server
- [webhook.site](https://webhook.site/) to inspect webhook payloads
- NowPayments sandbox environment with test payments

## Additional Resources

- [NowPayments API Documentation](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [NowPayments IPN Documentation](https://nowpayments.io/help/how-to-set-up-ipn)
