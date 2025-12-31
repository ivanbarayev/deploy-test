# Testing NowPayments Webhook Without Signature

## ⚠️ WARNING: FOR TESTING ONLY!

This guide shows how to test webhooks without signature verification. **NEVER use this in production!**

## Option 1: Test with Valid Signature (Recommended)

Use the provided test script which generates valid signatures:

```bash
pnpm -F @projectfe/example-web test:webhook
```

## Option 2: Temporarily Disable Signature Check (Testing Only)

If you need to test without a signature temporarily, modify the webhook handler:

### Step 1: Update Route Handler

Edit `apps/example-web/src/app/api/webhooks/nowpayments/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // ⚠️ TESTING ONLY: Skip signature verification
    const SKIP_SIGNATURE = process.env.SKIP_WEBHOOK_SIGNATURE === "true";
    
    if (SKIP_SIGNATURE) {
      console.warn("⚠️ WARNING: Webhook signature verification is DISABLED!");
      
      // Parse payload directly
      const jsonPayload = JSON.parse(body);
      const payload = NowPaymentsIPNPayloadSchema.parse(jsonPayload);
      
      // Process webhook...
      switch (payload.payment_status) {
        case "finished":
          handleFinishedPayment(payload);
          break;
        // ... other cases
      }
      
      return NextResponse.json({ 
        status: "received", 
        processed: true 
      });
    }

    // Normal signature verification
    const verification = await provider.verifyWebhook(body, headers);
    // ... rest of code
  }
}
```

### Step 2: Set Environment Variable

```bash
# .env.local
SKIP_WEBHOOK_SIGNATURE=true  # ⚠️ REMOVE IN PRODUCTION!
```

### Step 3: Test with curl

```bash
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": 123456789,
    "payment_status": "finished",
    "price_amount": 10,
    "price_currency": "usd",
    "actually_paid": 150,
    "pay_currency": "trx",
    "purchase_id": "test-123"
  }'
```

## Option 3: Use ngrok with Real Webhooks

Test with actual NowPayments webhooks:

```bash
# 1. Start your server
pnpm dev:example-web

# 2. Start ngrok
ngrok http 3000

# 3. Configure webhook URL in NowPayments dashboard
# Use: https://YOUR-NGROK-ID.ngrok.io/api/webhooks/nowpayments

# 4. Make a test payment in NowPayments sandbox
```

## Debugging Signature Issues

### Check Headers

Add this to your webhook handler:

```typescript
console.log("All headers:", JSON.stringify(Object.fromEntries(request.headers), null, 2));
console.log("Signature header:", request.headers.get("x-nowpayments-sig"));
```

### Check Body

```typescript
console.log("Body:", body);
console.log("Body length:", body.length);
```

### Check IPN Secret

```typescript
console.log("IPN Secret configured:", !!process.env.NOWPAYMENTS_IPN_SECRET);
console.log("IPN Secret length:", process.env.NOWPAYMENTS_IPN_SECRET?.length);
```

## Common Issues

### 1. Missing Signature Header

**Symptom**: `Missing or invalid x-nowpayments-sig header`

**Solutions**:
- Check if NowPayments is actually sending the header
- Verify header name case (try both `X-Nowpayments-Sig` and `x-nowpayments-sig`)
- Check if reverse proxy/middleware is stripping headers

### 2. Wrong IPN Secret

**Symptom**: `Signature verification failed`

**Solutions**:
- Copy secret from NowPayments dashboard: Settings → IPN Settings
- Check for extra spaces or newlines
- Verify using correct environment (sandbox vs production)

### 3. Body Modified

**Symptom**: `Signature verification failed`

**Solutions**:
- Don't parse JSON before verification
- Don't modify the request body
- Get raw text with `await request.text()`

## Testing Signature Generation

Test if your signature generation works:

```typescript
import crypto from "node:crypto";

const payload = { payment_id: 123, payment_status: "finished" };
const secret = "your-secret";

// Sort keys
const sortedPayload = Object.keys(payload)
  .sort()
  .reduce((obj, key) => {
    obj[key] = payload[key];
    return obj;
  }, {});

// Generate signature
const payloadString = JSON.stringify(sortedPayload);
const hmac = crypto.createHmac("sha512", secret);
hmac.update(payloadString);
const signature = hmac.digest("hex");

console.log("Signature:", signature);
```

## ⚠️ Remember

**ALWAYS enable signature verification in production!**

Remove these after testing:
- [ ] Remove `SKIP_WEBHOOK_SIGNATURE` environment variable
- [ ] Remove signature skip code
- [ ] Enable signature verification
- [ ] Test with valid signatures

## Production Checklist

Before deploying:
- [ ] Signature verification enabled
- [ ] IPN Secret configured
- [ ] HTTPS enabled
- [ ] Headers logged for debugging (temporarily)
- [ ] Test with real sandbox payment
- [ ] Remove debug logging
- [ ] Monitor first few webhooks

---

**Need Help?**

1. Check server logs for detailed error messages
2. Verify NowPayments dashboard configuration
3. Test with the provided test script first
4. Use ngrok for real webhook testing

