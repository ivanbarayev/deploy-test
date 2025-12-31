# NowPayments Webhook Integration Guide

This guide explains how to integrate NowPayments webhooks (IPN - Instant Payment Notifications) into your application.

## 📋 Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Implementation](#implementation)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

NowPayments webhooks notify your application about payment status changes in real-time. This allows you to:

- Automatically fulfill orders when payments complete
- Handle failed or expired payments
- Track partial payments
- Process refunds

## 🔧 Setup

### 1. Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# NowPayments API Key
NOWPAYMENTS_API_KEY=your_api_key_here

# NowPayments IPN Secret (for webhook signature verification)
# Get this from NowPayments dashboard -> Settings -> IPN
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here

# Environment
NODE_ENV=development
```

### 2. Configure Webhook URL in NowPayments Dashboard

1. Log in to [NowPayments Dashboard](https://account.nowpayments.io/)
2. Go to **Settings** → **IPN Settings**
3. Set your IPN callback URL:
   - **Development**: Use [ngrok](https://ngrok.com/) or similar: `https://your-ngrok-url.ngrok.io/api/webhooks/nowpayments`
   - **Production**: `https://yourdomain.com/api/webhooks/nowpayments`
4. Copy the **IPN Secret** and save it in your environment variables

## 🚀 Implementation

### Webhook Endpoint

The webhook endpoint is already created at:
```
apps/example-web/src/app/api/webhooks/nowpayments/route.ts
```

### Key Features

✅ **Automatic signature verification** - Validates webhooks are from NowPayments  
✅ **Type-safe payload parsing** - Uses Zod schemas for validation  
✅ **Status-based handling** - Different handlers for each payment status  
✅ **Error handling** - Graceful error handling and logging  
✅ **Idempotent** - Safe to process the same webhook multiple times  

### Webhook Payload Example

```json
{
  "payment_id": 123456789,
  "parent_payment_id": 987654321,
  "invoice_id": null,
  "payment_status": "finished",
  "pay_address": "TBkZhbFEhqhYmkzWPkVvC4zKXJVwQ5NkPZ",
  "payin_extra_id": null,
  "price_amount": 1,
  "price_currency": "usd",
  "pay_amount": 15,
  "actually_paid": 15,
  "actually_paid_at_fiat": 1,
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

### Payment Statuses

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `waiting` | Waiting for payment | Monitor |
| `confirming` | Payment being confirmed | Monitor |
| `confirmed` | Payment confirmed | Monitor |
| `sending` | Payment being sent to wallet | Monitor |
| `partially_paid` | User paid less than required | Decide: accept, refund, or request more |
| `finished` | **Payment completed** | **Fulfill order** |
| `failed` | Payment failed | Mark order as failed, notify user |
| `refunded` | Payment refunded | Reverse credits, notify user |
| `expired` | Payment expired | Clean up, notify user |

### Customizing Webhook Handlers

Edit `apps/example-web/src/app/api/webhooks/nowpayments/route.ts`:

```typescript
async function handleFinishedPayment(payload: NowPaymentsIPNPayload) {
  // Your custom logic here
  
  // 1. Update database
  await db.payments.update({
    where: { purchaseId: payload.purchase_id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      actuallyPaid: payload.actually_paid,
      // ... more fields
    },
  });

  // 2. Fulfill order
  await fulfillOrder(payload.purchase_id);

  // 3. Send confirmation email
  await sendEmail({
    to: user.email,
    subject: 'Payment Received',
    template: 'payment-confirmation',
    data: { amount: payload.actually_paid, currency: payload.pay_currency },
  });

  // 4. Update user credits/balance
  await updateUserCredits(payload.purchase_id, payload.outcome_amount);
}
```

## 🧪 Testing

### Local Testing with Mock Webhooks

We've created a test script that simulates webhook calls:

```bash
# 1. Start your dev server
pnpm dev:example-web

# 2. In another terminal, run the test script
cd apps/example-web
pnpm tsx test-nowpayments-webhook.ts
```

This will send mock webhooks for all payment statuses (finished, failed, expired, etc.) to your local server.

### Testing with ngrok

For testing with real NowPayments webhooks:

```bash
# 1. Install ngrok
# Download from https://ngrok.com/download

# 2. Start your dev server
pnpm dev:example-web

# 3. Start ngrok tunnel
ngrok http 3000

# 4. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# 5. Add to NowPayments dashboard:
# https://abc123.ngrok.io/api/webhooks/nowpayments
```

### Manual Testing with curl

```bash
# Set your IPN secret
export IPN_SECRET="your-ipn-secret"

# Create test payload
cat > payload.json << 'EOF'
{
  "payment_id": 999999,
  "payment_status": "finished",
  "price_amount": 10,
  "price_currency": "usd",
  "pay_amount": 150,
  "actually_paid": 150,
  "pay_currency": "trx",
  "purchase_id": "test-123"
}
EOF

# Generate signature (requires Node.js)
node -e "
const crypto = require('crypto');
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync('payload.json', 'utf8'));
const sorted = JSON.stringify(payload, Object.keys(payload).sort());
const sig = crypto.createHmac('sha512', process.env.IPN_SECRET).update(sorted).digest('hex');
console.log(sig);
" > signature.txt

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: $(cat signature.txt)" \
  -d @payload.json
```

## 🌐 Production Deployment

### Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production NowPayments API key
- [ ] Configure production webhook URL in NowPayments dashboard
- [ ] Enable HTTPS (required for production webhooks)
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Implement webhook retry logic if needed
- [ ] Log all webhooks for auditing
- [ ] Test with small amounts first

### Monitoring

Add monitoring to track webhook health:

```typescript
// In your webhook handler
import { metrics } from './metrics';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ... webhook processing ...
    
    metrics.increment('nowpayments.webhook.success');
    metrics.timing('nowpayments.webhook.duration', Date.now() - startTime);
  } catch (error) {
    metrics.increment('nowpayments.webhook.error');
    metrics.increment(`nowpayments.webhook.error.${error.code}`);
    // ... error handling ...
  }
}
```

### Database Schema

Example schema for storing payment webhooks:

```typescript
// In your database schema
export const paymentWebhooks = pgTable('payment_webhooks', {
  id: serial('id').primaryKey(),
  provider: text('provider').notNull(), // 'nowpayments'
  paymentId: text('payment_id').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload').notNull(),
  signature: text('signature'),
  verified: boolean('verified').default(false),
  processed: boolean('processed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Index for quick lookups
CREATE INDEX idx_payment_webhooks_payment_id ON payment_webhooks(payment_id);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
```

## 🔍 Troubleshooting

### Webhook Not Received

1. **Check webhook URL**
   - Verify URL is correct in NowPayments dashboard
   - Must be HTTPS in production
   - Must be publicly accessible

2. **Check firewall/security**
   - Allow NowPayments IP addresses
   - Check if reverse proxy is blocking requests

3. **Check logs**
   - Look for incoming requests in server logs
   - Check application logs for errors

### Signature Verification Fails

1. **Check IPN secret**
   ```typescript
   console.log('IPN Secret:', process.env.NOWPAYMENTS_IPN_SECRET?.substring(0, 10) + '...');
   ```

2. **Log signature details**
   ```typescript
   console.log('Received signature:', headers['x-nowpayments-sig']);
   console.log('Payload:', body);
   ```

3. **Verify payload format**
   - Ensure payload is valid JSON
   - Check for extra whitespace or encoding issues

### Duplicate Webhooks

NowPayments may send the same webhook multiple times. Handle this by:

1. **Check if already processed**
   ```typescript
   const existing = await db.paymentWebhooks.findFirst({
     where: { paymentId: payload.payment_id, status: payload.payment_status }
   });
   
   if (existing?.processed) {
     return NextResponse.json({ message: 'Already processed' });
   }
   ```

2. **Use database transactions**
   ```typescript
   await db.$transaction(async (tx) => {
     // Check and update in single transaction
   });
   ```

### Webhook Timeouts

If processing takes too long:

1. **Return 200 immediately**
   ```typescript
   // Queue processing
   await webhookQueue.add({ payload, signature });
   
   // Return immediately
   return NextResponse.json({ received: true });
   ```

2. **Process asynchronously**
   - Use job queue (BullMQ, Agenda, etc.)
   - Process in background worker

## 📚 Additional Resources

- [NowPayments API Documentation](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [NowPayments IPN Guide](https://nowpayments.io/help/how-to-set-up-ipn)
- [Webhook Security Best Practices](https://webhooks.fyi/)
- [Example Implementation](./src/app/api/webhooks/nowpayments/route.ts)
- [Webhook Test Script](./test-nowpayments-webhook.ts)

## 🆘 Support

If you encounter issues:

1. Check this documentation
2. Review the [webhook example](./src/app/api/webhooks/nowpayments/route.ts)
3. Run the test script to verify local setup
4. Check NowPayments support documentation
5. Contact NowPayments support at support@nowpayments.io

