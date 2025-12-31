# 🔍 NowPayments Webhook Troubleshooting Guide

## Your Current Issue

```json
{
    "status": "received",
    "processed": false,
    "error": "Missing or invalid x-nowpayments-sig header"
}
```

This means the webhook endpoint is working, but the signature header is missing.

## Quick Fixes

### Fix 1: Test with Valid Signature (Recommended)

Use the built-in test script that generates valid signatures:

```bash
# Terminal 1: Start server
pnpm dev:example-web

# Terminal 2: Run test script
pnpm -F @projectfe/example-web test:webhook
```

### Fix 2: Check How You're Sending the Request

If you're testing with curl/Postman/etc., you need to include the signature header:

```bash
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: YOUR_SIGNATURE_HERE" \
  -d '{"payment_id":123,"payment_status":"finished",...}'
```

### Fix 3: PowerShell Test Script

Run the simple test script I created:

```powershell
cd apps/example-web
.\test-webhook-simple.ps1
```

This will show you the exact error and provide guidance.

## Understanding the Error

The error occurs because:

1. **NowPayments sends a signature** in the `x-nowpayments-sig` header
2. **Your webhook verifies this signature** to ensure the request is genuine
3. **When testing locally** without the header, verification fails

This is **GOOD** - it means your security is working! 🔒

## Solutions by Scenario

### Scenario 1: Testing Locally

**Use the test script with signature generation:**

```bash
pnpm -F @projectfe/example-web test:webhook
```

This script:
- ✅ Generates valid HMAC-SHA512 signatures
- ✅ Tests all payment statuses
- ✅ Includes the proper headers

### Scenario 2: Testing with Real NowPayments

**Use ngrok to expose your local server:**

```bash
# 1. Install ngrok: https://ngrok.com/download

# 2. Start your server
pnpm dev:example-web

# 3. In another terminal, start ngrok
ngrok http 3000

# 4. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# 5. Configure in NowPayments Dashboard:
# Go to: Settings → IPN Settings
# Set URL: https://abc123.ngrok.io/api/webhooks/nowpayments

# 6. Make a test payment in sandbox
```

### Scenario 3: Quick Test Without Signature (Unsafe!)

⚠️ **Only for quick local testing!**

Create a temporary test endpoint:

```typescript
// apps/example-web/src/app/api/test-webhook/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NowPaymentsIPNPayloadSchema } from "@projectfe/payments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = NowPaymentsIPNPayloadSchema.parse(body);
    
    console.log("Test webhook received:", payload);
    
    return NextResponse.json({ 
      status: "received", 
      processed: true,
      message: "Test endpoint - no signature verification"
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "received",
      processed: false,
      error: error instanceof Error ? error.message : "Invalid payload"
    }, { status: 400 });
  }
}
```

Then test:
```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": 123,
    "payment_status": "finished",
    "price_amount": 10,
    "price_currency": "usd",
    "actually_paid": 150,
    "pay_currency": "trx",
    "purchase_id": "test-123"
  }'
```

## Debugging Steps

### Step 1: Check Server Logs

Start your server and watch the logs:

```bash
pnpm dev:example-web
```

When a webhook comes in, you should see:
```
Received webhook request
Headers: {...}
Body length: 234
Signature header: undefined  <-- This is your problem!
```

### Step 2: Verify Environment Variables

Check your `.env.local`:

```bash
# apps/example-web/.env.local
NOWPAYMENTS_API_KEY=your_key_here
NOWPAYMENTS_IPN_SECRET=your_secret_here
NODE_ENV=development
```

Verify they're loaded:
```typescript
console.log("API Key set:", !!process.env.NOWPAYMENTS_API_KEY);
console.log("IPN Secret set:", !!process.env.NOWPAYMENTS_IPN_SECRET);
```

### Step 3: Test Signature Generation

Create a test file:

```typescript
// test-signature.ts
import crypto from "node:crypto";

const payload = {
  payment_id: 123,
  payment_status: "finished",
};

const secret = "your-ipn-secret";

// Sort object keys
const sortedKeys = Object.keys(payload).sort();
const sortedPayload: any = {};
sortedKeys.forEach(key => {
  sortedPayload[key] = (payload as any)[key];
});

// Generate signature
const payloadString = JSON.stringify(sortedPayload);
const hmac = crypto.createHmac("sha512", secret);
hmac.update(payloadString);
const signature = hmac.digest("hex");

console.log("Payload:", payloadString);
console.log("Signature:", signature);
```

Run it:
```bash
npx tsx test-signature.ts
```

## Common Issues & Solutions

### Issue: "Missing or invalid x-nowpayments-sig header"

**Cause**: Signature header not sent with request

**Solutions**:
1. Use the test script: `pnpm -F @projectfe/example-web test:webhook`
2. Add header manually: `-H "x-nowpayments-sig: YOUR_SIG"`
3. Use ngrok for real webhooks from NowPayments

### Issue: "Signature verification failed"

**Cause**: Signature doesn't match

**Solutions**:
1. Check IPN secret is correct (copy from dashboard)
2. Ensure payload hasn't been modified
3. Verify correct environment (sandbox vs production)
4. Check payload is sorted correctly

### Issue: Headers not being received

**Cause**: Middleware or proxy stripping headers

**Solutions**:
1. Check Next.js middleware
2. Verify reverse proxy config (nginx, etc.)
3. Test direct to Node.js (skip proxy)

### Issue: Can't configure IPN secret

**Solution**: Get it from NowPayments Dashboard:
1. Login to https://account.nowpayments.io/
2. Go to Settings → IPN Settings  
3. Copy "IPN Secret Key"
4. Add to `.env.local`

## Testing Checklist

- [ ] Server is running (`pnpm dev:example-web`)
- [ ] Environment variables are set (`.env.local`)
- [ ] IPN secret is correct (from dashboard)
- [ ] Using test script with signatures
- [ ] Checking server logs for details
- [ ] Webhook endpoint is accessible

## Quick Test Commands

```bash
# 1. Check server is running
curl http://localhost:3000/api/health

# 2. Test webhook with signature (recommended)
pnpm -F @projectfe/example-web test:webhook

# 3. Simple test without signature (will fail, but shows endpoint works)
.\apps\example-web\test-webhook-simple.ps1

# 4. Check environment
echo $env:NOWPAYMENTS_API_KEY
echo $env:NOWPAYMENTS_IPN_SECRET
```

## Next Steps

1. **For local development**: Use `pnpm -F @projectfe/example-web test:webhook`
2. **For testing with real data**: Use ngrok + NowPayments sandbox
3. **For production**: Configure webhook URL in dashboard with HTTPS

## Still Having Issues?

1. Check the webhook handler logs (see "Debug logging" section in code)
2. Verify payload format matches `NowPaymentsIPNPayload` type
3. Test with minimal payload first
4. Check firewall/security settings

## Quick Reference

| Method | Use Case | Signature Required |
|--------|----------|-------------------|
| Test script | Local development | ✅ Yes (generated) |
| ngrok | Real webhook testing | ✅ Yes (from NowPayments) |
| Test endpoint | Quick tests | ❌ No |
| Production | Live payments | ✅ Yes (required!) |

---

**TL;DR**: Your webhook is working correctly! It's rejecting requests without valid signatures, which is good security. Use the test script that generates signatures:

```bash
pnpm -F @projectfe/example-web test:webhook
```

Or test with real NowPayments webhooks using ngrok.

