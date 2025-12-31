# ✅ Your Webhook is Working Correctly!

## What You're Seeing

```json
{
    "status": "received",
    "processed": false,
    "error": "Missing or invalid x-nowpayments-sig header"
}
```

## This is Actually GOOD NEWS! 🎉

Your webhook endpoint is:
- ✅ **Running** - It received the request
- ✅ **Responding** - It sent back a proper error
- ✅ **Secure** - It's rejecting requests without valid signatures

The error means **your security is working as designed!**

## Why This Happens

When you test a webhook endpoint directly (with curl, Postman, etc.), you're not including the cryptographic signature that NowPayments includes. The webhook correctly rejects these requests.

Think of it like trying to enter a building without showing ID - the security guard (your webhook) is doing their job by turning you away!

## How to Test Properly

### Option 1: Use the Test Script (Recommended) ⭐

This generates valid signatures for you:

```bash
# Terminal 1
pnpm dev:example-web

# Terminal 2  
pnpm -F @projectfe/example-web test:webhook
```

**Expected Output:**
```
✅ Webhook processed successfully
Status: 200
Response: {"status":"received","processed":true}
```

### Option 2: Test with Real NowPayments

Use ngrok to receive real webhooks:

```bash
# 1. Start server
pnpm dev:example-web

# 2. Start ngrok (in another terminal)
ngrok http 3000

# 3. Configure in NowPayments dashboard
# https://YOUR-ID.ngrok.io/api/webhooks/nowpayments

# 4. Make a sandbox payment
```

### Option 3: Simple Test (Will Show the Error)

This is useful to confirm the endpoint is reachable:

```powershell
# This WILL show the signature error (expected!)
pnpm -F @projectfe/example-web test:webhook-simple
```

## What Each Test Does

| Test Method | What It Tests | Expected Result |
|-------------|--------------|-----------------|
| `test:webhook` | Full integration with signatures | ✅ Success |
| `test:webhook-simple` | Endpoint reachability | ⚠️ Signature error (expected) |
| ngrok + NowPayments | Real webhook flow | ✅ Success |

## Understanding the Flow

### Correct Flow (with signature)
```
NowPayments
    ↓
Generates HMAC-SHA512 signature
    ↓
Sends webhook with x-nowpayments-sig header
    ↓
Your endpoint verifies signature
    ↓
✅ Processes payment
```

### Your Current Test (without signature)
```
Your test tool (curl/Postman)
    ↓
Sends webhook WITHOUT signature
    ↓
Your endpoint looks for signature
    ↓
❌ "Missing or invalid x-nowpayments-sig header"
```

## Quick Fix Commands

```bash
# Make sure you're in the project root
cd C:\Users\ivan\Github\Dating\projectfe-external_payments

# Terminal 1: Start the server
pnpm dev:example-web

# Terminal 2: Run proper test with signatures
pnpm -F @projectfe/example-web test:webhook
```

## What You Should See (Success)

When testing with the proper script:

```
=============================================================
Testing FINISHED webhook
=============================================================
Payload: {
  "payment_id": 123456789,
  "payment_status": "finished",
  ...
}
Signature: abc123def456...

Response Status: 200
Response: {
  "status": "received",
  "processed": true
}
✅ Webhook processed successfully
```

## Troubleshooting

### If test:webhook fails

1. **Check environment variables**:
```bash
# In apps/example-web/.env.local
NOWPAYMENTS_API_KEY=your_key
NOWPAYMENTS_IPN_SECRET=your_secret
```

2. **Restart the server** after adding env vars

3. **Check server logs** for detailed errors

### If you see connection errors

1. Make sure server is running: `pnpm dev:example-web`
2. Check port 3000 is not in use
3. Try: `netstat -ano | findstr :3000`

## Production Checklist

Before going live:

- [ ] Signature verification is enabled (it is!)
- [ ] IPN secret configured in both:
  - [ ] `.env` file
  - [ ] NowPayments dashboard
- [ ] Webhook URL uses HTTPS
- [ ] Test with sandbox payment first
- [ ] Monitor logs for first few payments

## Files Reference

| File | Purpose |
|------|---------|
| `test-nowpayments-webhook.ts` | ✅ Proper testing with signatures |
| `test-webhook-simple.ps1` | ⚠️ Basic connectivity test |
| `TROUBLESHOOTING.md` | 📖 Detailed troubleshooting guide |
| `WEBHOOK_GUIDE.md` | 📖 Complete integration guide |

## Summary

**Your webhook is configured correctly!** The error you're seeing is the security feature working as intended. To test properly:

1. Use: `pnpm -F @projectfe/example-web test:webhook`
2. Or use ngrok with real NowPayments webhooks

**Don't worry about the signature error when testing manually - it's supposed to happen!** 🔒

---

## Need More Help?

📖 Read: `apps/example-web/TROUBLESHOOTING.md`  
💬 Check server logs when testing  
🧪 Use the test script with valid signatures

**You're all set! Happy coding!** 🚀

