# Payment Gateway System

A flexible, extensible payment gateway system that supports multiple payment providers with idempotency, ACID compliance, and webhook handling.

## Features

- **Multi-Provider Support**: Currently supports NowPayments (crypto) and PayPal, with easy extensibility for new providers
- **Idempotency**: Prevents duplicate payments using idempotency keys
- **ACID Compliance**: Uses database transactions to ensure data consistency
- **Webhook Handling**: Secure webhook processing with signature verification
- **Status Tracking**: Automatic status updates via webhooks and cron job polling
- **Audit Trail**: Full logging of webhook events for debugging

## Architecture

```
packages/
├── payments/           # Core payment library
│   ├── src/
│   │   ├── types.ts          # Common types and interfaces
│   │   ├── service.ts        # PaymentService orchestration
│   │   └── providers/
│   │       ├── nowpayments/  # NowPayments implementation
│   │       └── paypal/       # PayPal implementation
│
├── core-db/
│   └── src/schemas/payments/  # Database schemas
│
apps/example-web/
├── src/
│   ├── lib/payments.ts       # Service initialization
│   └── app/api/
│       ├── payments/         # Payment CRUD endpoints
│       ├── callbacks/        # Webhook handlers
│       │   ├── nowpayments/
│       │   └── paypal/
│       ├── webhooks/logs/    # Webhook log viewer
│       └── cron/check-payments/  # Status polling
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# NowPayments Configuration
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NOWPAYMENTS_SANDBOX_MODE=true

# PayPal Configuration
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_SANDBOX_MODE=true

# Optional: Cron job security
CRON_SECRET=your_cron_secret
```

### 2. Database Migration

Run the database migration to create payment tables:

```bash
pnpm core-db:generate   # Generate migrations
pnpm core-db:migrate    # Apply migrations
```

### 3. Configure Webhooks

Configure your payment provider webhooks:

- **NowPayments IPN URL**: `https://your-domain.com/api/callbacks/nowpayments`
- **PayPal Webhook URL**: `https://your-domain.com/api/callbacks/paypal`

## API Endpoints

### Create Payment

```http
POST /api/payments
Content-Type: application/json
X-Idempotency-Key: unique-key-123

{
  "provider": "nowpayments",
  "amount": 100.00,
  "currency": "USD",
  "payCurrency": "BTC",
  "orderId": "ORDER-123",
  "orderDescription": "Premium subscription",
  "successUrl": "https://your-site.com/success",
  "cancelUrl": "https://your-site.com/cancel"
}
```

**Response:**

```json
{
  "transactionId": 1,
  "externalId": "np_123456",
  "status": "pending",
  "payAddress": "bc1q...",
  "payAmount": 0.0025,
  "payCurrency": "BTC",
  "invoiceUrl": "https://nowpayments.io/payment/?iid=..."
}
```

### Get Payment Status

```http
GET /api/payments/123
GET /api/payments/123?refresh=true  # Force refresh from provider
```

### List Payments

```http
GET /api/payments
GET /api/payments?provider=nowpayments&status=pending&limit=20
```

### Webhook Logs

```http
GET /api/webhooks/logs
GET /api/webhooks/logs?provider=nowpayments&transactionId=123
```

### Manual Status Check (Cron)

```http
GET /api/cron/check-payments  # Manual trigger
POST /api/cron/check-payments  # With auth
```

## Payment Statuses

| Status           | Description                              |
| ---------------- | ---------------------------------------- |
| `pending`        | Payment created, awaiting payment        |
| `confirming`     | Payment received, awaiting confirmations |
| `confirmed`      | Payment confirmed by network             |
| `sending`        | Payout in progress                       |
| `partially_paid` | Partial amount received                  |
| `finished`       | Payment completed successfully           |
| `failed`         | Payment failed                           |
| `refunded`       | Payment refunded                         |
| `expired`        | Payment expired                          |

## Adding New Payment Providers

1. Create a new folder in `packages/payments/src/providers/your-provider/`
2. Implement the `PaymentProvider` interface:

```typescript
import type { PaymentProvider } from "../../types";

export class YourProvider implements PaymentProvider {
  readonly name = "yourprovider" as const;

  initialize(config: BaseProviderConfig): void { /* ... */ }

  async createPayment(request: CreatePaymentRequest): Promise</* ... */> { /* ... */ }

  async getPaymentStatus(externalId: string): Promise<ProviderStatusResponse> { /* ... */ }

  async verifyWebhook(/* ... */): Promise<WebhookVerificationResult> { /* ... */ }

  mapStatus(providerStatus: string): PaymentStatus { /* ... */ }
}
```

3. Add registration method to `PaymentService`:

```typescript
registerYourProvider(config: { /* ... */ }): void {
  this.registry.register("yourprovider", new YourProvider(), config);
}
```

4. Update the provider type in `packages/payments/src/types.ts`:

```typescript
export const PaymentProviderType = z.enum([
  "nowpayments",
  "paypal",
  "yourprovider",
]);
```

5. Create webhook handler at `apps/example-web/src/app/api/callbacks/yourprovider/route.ts`

## UI Testing Dashboard

Access the payment testing dashboard at `/payments`:

- Create test payments
- View payment history
- Monitor webhook logs
- Manually trigger status checks
- Filter by provider and status

## Cron Job Setup

For production, set up a cron job to check pending payments:

```bash
# Every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/cron/check-payments \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or use Vercel Cron:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-payments",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Database Schema

### Payment Transactions

- `id` - Internal transaction ID
- `idempotency_key` - Unique key for idempotent requests
- `external_id` - Payment ID from provider
- `provider` - Payment provider name
- `status` - Current payment status
- `requested_amount` / `requested_currency` - Original payment amount
- `received_amount` / `received_currency` - Actual received amount
- `pay_address` / `pay_currency` / `pay_amount` - Crypto payment details
- `invoice_url` - Provider checkout URL
- `webhook_count` - Number of webhooks received
- `provider_metadata` - Raw provider response data
- `client_metadata` - Custom client metadata

### Webhook Logs

- `id` - Log entry ID
- `transaction_id` - Related transaction
- `provider` - Provider that sent webhook
- `event_type` - Webhook event type
- `raw_payload` / `raw_headers` - Full request data
- `signature_valid` - Signature verification result
- `processed` - Whether event was processed
- `error` - Any error message

## Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures in production
2. **Idempotency**: Use unique idempotency keys for each payment intent
3. **HTTPS**: Ensure all webhook URLs use HTTPS
4. **IP Whitelisting**: Consider whitelisting provider IP ranges
5. **Rate Limiting**: Implement rate limiting on payment creation endpoints
6. **Audit Logging**: All webhook events are logged for audit trail

## Troubleshooting

### Webhook Not Processing

1. Check webhook logs at `/api/webhooks/logs`
2. Verify signature secret is configured correctly
3. Check provider-specific headers are being passed

### Payment Status Not Updating

1. Trigger manual check at `/api/cron/check-payments`
2. Verify provider API credentials
3. Check for errors in webhook logs

### Duplicate Payments

Ensure you're using unique idempotency keys for each payment intent.
