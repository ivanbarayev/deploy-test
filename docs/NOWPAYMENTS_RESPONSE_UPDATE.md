# NOWPayments API Response Update

## Overview
Updated the NOWPayments integration to properly handle all fields returned by the NOWPayments payment status API endpoint.

## Changes Made

### 1. Updated NOWPayments Type Schemas
**File:** `packages/payments/src/providers/nowpayments/types.ts`

#### NowPaymentsPaymentResponseSchema
- ✅ Added `type` field (e.g., "crypto2crypto")
- ✅ Fixed `burning_percent` to handle both string and number types (API returns `"null"` as string)
- ✅ Fixed `purchase_id` to handle both string and number types
- ✅ Fixed `invoice_id` to be nullable and handle both string and number types
- ✅ Fixed `payout_hash` and `payin_hash` to be nullable

#### NowPaymentsIPNPayloadSchema
- ✅ Added `burning_percent` field with union type for string/number
- ✅ Added `type` field
- ✅ Fixed `purchase_id` to handle both string and number types
- ✅ Fixed `payin_hash` and `payout_hash` to be nullable

### 2. Verified Integration
- ✅ Payment service properly maps NOWPayments response to internal format
- ✅ All fields are correctly parsed and validated
- ✅ Database schema supports all necessary fields
- ✅ API endpoint returns complete payment status

## Sample NOWPayments Response
```json
{
    "payment_id": 4996449586,
    "invoice_id": null,
    "payment_status": "waiting",
    "pay_address": "0xe920Dc12d21d37d0D8b8af4018686b441e75ff90",
    "payin_extra_id": null,
    "price_amount": 0.6,
    "price_currency": "usd",
    "pay_amount": 0.59866793,
    "actually_paid": 0,
    "pay_currency": "usdtarb",
    "order_id": "789654",
    "order_description": "Test payment",
    "purchase_id": 5985151872,
    "outcome_amount": 0.495227,
    "outcome_currency": "usdtarb",
    "payout_hash": null,
    "payin_hash": null,
    "created_at": "2025-12-26T23:04:45.625Z",
    "updated_at": "2025-12-26T23:04:45.625Z",
    "burning_percent": "null",
    "type": "crypto2crypto"
}
```

## API Endpoint Response Format
**Endpoint:** `GET /api/payments/[id]?refresh=true`

The endpoint returns a normalized payment status response:
```typescript
{
  transactionId: number;
  externalId?: string;
  status: PaymentStatus;
  requestedAmount: number;
  requestedCurrency: string;
  receivedAmount?: number;
  receivedCurrency?: string;
  payAddress?: string;
  payCurrency?: string;
  payAmount?: number;
  invoiceUrl?: string;
  confirmedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  providerData?: Record<string, unknown>; // Contains full NOWPayments response
}
```

## How It Works

1. **Client calls API:** `GET /api/payments/123?refresh=true`
2. **API fetches from NOWPayments:** Gets latest payment status
3. **Provider parses response:** Validates all fields using Zod schema
4. **Service updates database:** Stores full response in `providerMetadata`
5. **API returns normalized response:** Client receives standardized format

## Key Features

- ✅ **Full Field Support:** All NOWPayments fields are captured
- ✅ **Type Safety:** Zod schemas validate response structure
- ✅ **Flexible Types:** Handles string/number variations for fields like `purchase_id`
- ✅ **Nullable Fields:** Properly handles `null` values from API
- ✅ **Raw Data Preservation:** Full response stored in `providerData`
- ✅ **Error Handling:** Graceful error handling with proper status codes

## Testing

A test script was created to verify the parsing:
```bash
cd packages/payments
npx tsx test-nowpayments-response.ts
```

Result: ✅ All fields parse correctly

## Related Files

- `packages/payments/src/providers/nowpayments/types.ts` - Type definitions
- `packages/payments/src/providers/nowpayments/provider.ts` - Provider implementation
- `packages/payments/src/service.ts` - Payment service
- `apps/example-web/src/app/api/payments/[id]/route.ts` - API endpoint
- `packages/core-db/src/schemas/payments/payment-schema.ts` - Database schema

## Next Steps

The integration is now ready to handle all NOWPayments API responses. You can:

1. **Test with real payments:** Create a payment and check status
2. **Monitor webhooks:** Verify webhook parsing works correctly
3. **Query payment data:** Access full provider data via API
4. **Build UI components:** Display payment details to users

## Notes

- The `providerData` field contains the complete raw NOWPayments response
- Status mapping is handled by `mapStatus()` method in the provider
- All monetary values are stored as decimal strings in the database
- The API normalizes responses across different payment providers

