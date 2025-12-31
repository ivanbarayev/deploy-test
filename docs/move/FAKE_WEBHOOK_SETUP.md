# Fake Webhook Transaction - Test Setup

## Overview
Successfully generated and integrated a fake webhook transaction for testing purposes.

## Files Updated/Created

### 1. **fake-webhook-payload.json** (NEW)
- Standalone JSON file with your exact webhook payload
- Location: `apps/example-web/fake-webhook-payload.json`
- Can be used for manual testing or imported into other tools

### 2. **test-nowpayments-webhook.ts** (UPDATED)
- Updated the `finished` status mock payload with your exact data
- Location: `apps/example-web/test-nowpayments-webhook.ts`
- Run with: `pnpm test:webhook`

### 3. **test-webhook-simple.ps1** (UPDATED)
- Updated PowerShell script with your exact payload
- Location: `apps/example-web/test-webhook-simple.ps1`
- Run with: `pnpm test:webhook-simple`

## Test Payload Details

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

## How to Test

### Option 1: TypeScript Test (with signature verification)
```bash
pnpm test:webhook
```
This will test all webhook statuses including your finished transaction.

### Option 2: PowerShell Quick Test (without signature)
```bash
pnpm test:webhook-simple
```
This sends your payload directly to the webhook endpoint.

### Option 3: Manual Test with curl
```bash
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -d @fake-webhook-payload.json
```

## Key Changes Made

1. **Fixed JSON syntax error**: Added missing comma after `payment_extra_ids`
2. **Updated test data**: Changed from generic test values to your specific values:
   - `pay_address`: "address" (simplified from TRX address)
   - `actually_paid_at_fiat`: 0 (changed from 1)
   - `purchase_id`: "123456789" (changed from "test-purchase-123")
   - All other values match your exact specification

## Notes

- The payload is now consistent across all three test methods
- The TypeScript test includes proper HMAC-SHA512 signature generation
- The PowerShell script is simpler but may not pass signature verification
- The JSON file can be used for any external testing tools

