# API Documentation with Swagger/OpenAPI

This project includes comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Accessing the Documentation

### Interactive Swagger UI

Visit the Swagger UI interface to explore and test all API endpoints interactively:

```
http://localhost:3000/api/docs
```

The Swagger UI allows you to:

- View all available endpoints with detailed descriptions
- See request/response schemas
- Try out endpoints directly with a test interface
- Copy example curl commands

### Raw OpenAPI Specification

To access the raw OpenAPI/Swagger specification in JSON format:

```
http://localhost:3000/api/openapi.json
```

This endpoint serves the OpenAPI 3.0.0 specification and is cached for 1 hour.

## API Endpoints Overview

### Payment Management

- **POST /api/payments** - Create a new payment
- **GET /api/payments** - List payments with filtering
- **GET /api/payments/{id}** - Get payment details by ID

### Webhooks

- **POST /api/webhooks/nowpayments** - NowPayments IPN webhook handler
- **POST /api/webhooks/sign** - Generate HMAC-SHA512 signature for testing webhooks
- **GET /api/webhooks/logs** - Retrieve webhook logs for debugging

### Callbacks

- **POST /api/callbacks/nowpayments** - NowPayments callback alternative endpoint
- **GET /api/callbacks/nowpayments** - Health check for NowPayments webhook
- **POST /api/callbacks/paypal** - PayPal webhook handler
- **GET /api/callbacks/paypal** - Health check for PayPal webhook

### Cron Jobs

- **POST /api/cron/check-payments** - Check pending payment statuses (requires CRON_SECRET)

## Using the API

### Example: Create a Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: unique-key-123" \
  -d '{
    "provider": "nowpayments",
    "amount": 99.99,
    "currency": "USD",
    "payCurrency": "BTC",
    "orderId": "ORDER-12345",
    "orderDescription": "Premium subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }'
```

### Example: Get Payment Status

```bash
curl -X GET "http://localhost:3000/api/payments/123456?refresh=false" \
  -H "Content-Type: application/json"
```

### Example: List Payments with Filters

```bash
curl -X GET "http://localhost:3000/api/payments?provider=nowpayments&status=finished&limit=20&offset=0"
```

### Example: Generate Webhook Signature (for testing)

```bash
curl -X POST http://localhost:3000/api/webhooks/sign \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "payment_id": 123456789,
      "payment_status": "finished",
      "price_amount": 99.99,
      "price_currency": "USD",
      "actually_paid": 0.00123456,
      "pay_currency": "BTC"
    }
  }'
```

## Security Considerations

### CORS and Origin Verification

All webhook endpoints verify the origin and signature of incoming requests. Make sure to:

- Configure the correct webhook URLs in your payment provider settings
- Keep your IPN secrets and API keys secure in environment variables
- Never commit secrets to version control

### Cron Job Authentication

The `/api/cron/check-payments` endpoint requires authorization:

```bash
curl -X POST http://localhost:3000/api/cron/check-payments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Set the `CRON_SECRET` environment variable to enable this protection.

## Environment Variables

Required environment variables for webhook processing:

```env
# NowPayments
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret

# PayPal (if configured)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id

# Cron Job Security
CRON_SECRET=your_secret_key_for_cron_jobs

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

## Webhook Testing

### Using the /api/webhooks/sign Endpoint

For testing webhook functionality without the actual provider:

1. Create a test payload
2. Call `/api/webhooks/sign` to generate the signature
3. Send the signed payload to the webhook endpoint

Example test script:

```bash
# 1. Generate signature
SIGNATURE=$(curl -s -X POST http://localhost:3000/api/webhooks/sign \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "payment_id": 999,
      "payment_status": "finished"
    }
  }' | jq -r '.signature')

# 2. Send test webhook
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -H "X-NOWPAYMENTS-SIG: $SIGNATURE" \
  -d '{
    "payment_id": 999,
    "payment_status": "finished",
    "price_amount": 100,
    "price_currency": "USD",
    "actually_paid": 0.002,
    "pay_currency": "BTC",
    "purchase_id": "test-123"
  }'
```

## Viewing Webhook Logs

Check webhook logs for debugging:

```bash
# Get all recent logs
curl "http://localhost:3000/api/webhooks/logs"

# Get logs for a specific transaction
curl "http://localhost:3000/api/webhooks/logs?transactionId=123456"

# Get logs for a specific provider
curl "http://localhost:3000/api/webhooks/logs?provider=nowpayments&limit=100"
```

## Development Notes

### Adding Documentation to New Endpoints

When adding new API routes, include JSDoc comments with `@swagger` tags:

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Brief description
 *     description: Detailed description of what this endpoint does
 *     tags:
 *       - Category
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(request: NextRequest) {
  // ...
}
```

The OpenAPI specification is generated from these JSDoc comments and served at `/api/openapi.json`.

## Production Deployment

### Disabling Swagger UI in Production (Optional)

If you want to disable the Swagger UI in production, modify the `/api/docs` route:

```typescript
export function GET(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not available in production", { status: 403 });
  }
  // ... rest of Swagger UI code
}
```

### API Versioning

For future API versioning, consider:

- Creating separate documentation files for each version
- Using versioned URLs (e.g., `/api/v2/payments`)
- Maintaining backward compatibility or explicit deprecation notices

## Troubleshooting

### Swagger UI Not Loading

- Ensure the development server is running (`pnpm dev`)
- Check that `/api/docs` and `/api/openapi.json` endpoints are accessible
- Clear browser cache if styles don't load correctly

### Webhook Signature Verification Failures

- Verify that `NOWPAYMENTS_IPN_SECRET` is correctly set in environment
- Ensure the payload hasn't been modified after signing
- Check that the signature header name matches the provider's requirements

### Missing Endpoint Documentation

- Verify JSDoc comments are above the route handlers
- Ensure `@swagger` tags follow OpenAPI 3.0 syntax
- Restart the development server after adding documentation

## References

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [NowPayments Webhook Documentation](https://nowpayments.io/docs)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api/webhooks/)

## Support

For issues or questions about the API documentation:

1. Check the OpenAPI spec at `/api/openapi.json`
2. Review webhook logs at `/api/webhooks/logs`
3. Test endpoints via Swagger UI at `/api/docs`
