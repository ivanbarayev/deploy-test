# NowPayments Webhook Integration

Complete integration for NowPayments IPN (Instant Payment Notifications) webhooks with type safety, security, and comprehensive testing.

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [📋 Quick Reference](./QUICK_REFERENCE.md) | Quick commands and common tasks |
| [📖 Summary](move/NOWPAYMENTS_WEBHOOK_SUMMARY.md) | Complete overview of what was implemented |
| [🔧 Webhook Guide](./apps/example-web/WEBHOOK_GUIDE.md) | Detailed integration guide |
| [✅ Production Checklist](./PRODUCTION_CHECKLIST.md) | Pre-deployment checklist |
| [💡 Examples](./packages/payments/src/providers/nowpayments/webhook-example.md) | Code examples and usage |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
# Create .env.local in apps/example-web/
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NODE_ENV=development
```

### 3. Start Development
```bash
# Terminal 1: Start the server
pnpm dev:example-web

# Terminal 2: Test webhooks
pnpm -F @projectfe/example-web test:webhook
```

## 📂 Project Structure

```
projectfe-external_payments/
├── packages/
│   └── payments/
│       └── src/
│           └── providers/
│               └── nowpayments/
│                   ├── types.ts           # ✅ Updated webhook types
│                   ├── provider.ts        # Provider implementation
│                   ├── webhook-example.md # Documentation
│                   └── index.ts
├── apps/
│   └── example-web/
│       ├── src/
│       │   └── app/
│       │       └── api/
│       │           └── webhooks/
│       │               └── nowpayments/
│       │                   └── route.ts   # ✅ Webhook handler
│       ├── test-nowpayments-webhook.ts    # ✅ Test script
│       ├── WEBHOOK_GUIDE.md               # ✅ Integration guide
│       └── .env.example                   # ✅ Env template
├── QUICK_REFERENCE.md                     # ✅ Quick reference
├── NOWPAYMENTS_WEBHOOK_SUMMARY.md         # ✅ Summary
└── PRODUCTION_CHECKLIST.md                # ✅ Checklist
```

## ✨ Features

- ✅ **Type-Safe**: Full TypeScript support with Zod validation
- ✅ **Secure**: HMAC-SHA512 signature verification
- ✅ **Complete**: All webhook fields from your example integrated
- ✅ **Tested**: Comprehensive test suite included
- ✅ **Documented**: Extensive documentation and examples
- ✅ **Production-Ready**: Checklist and best practices included

## 🔑 Key Files

### Webhook Handler
**Location**: `apps/example-web/src/app/api/webhooks/nowpayments/route.ts`

Handles incoming webhooks with:
- Automatic signature verification
- Type-safe payload parsing
- Status-based routing
- Error handling

### Type Definitions
**Location**: `packages/payments/src/providers/nowpayments/types.ts`

Includes your webhook example fields:
- `payment_id`, `parent_payment_id`
- `invoice_id`, `payin_extra_id`
- `fee` object with deposit/withdrawal/service fees
- All payment amounts and currencies

### Test Script
**Location**: `apps/example-web/test-nowpayments-webhook.ts`

Mock webhook sender for testing:
- All payment statuses
- Valid/invalid signatures
- Fee calculations

## 📊 Webhook Payload

Your webhook example is fully integrated:

```typescript
{
  payment_id: 123456789,
  parent_payment_id: 987654321,
  invoice_id: null,
  payment_status: "finished",
  pay_address: "address",
  payin_extra_id: null,
  price_amount: 1,
  price_currency: "usd",
  pay_amount: 15,
  actually_paid: 15,
  actually_paid_at_fiat: 0,
  pay_currency: "trx",
  order_id: null,
  order_description: null,
  purchase_id: "123456789",
  outcome_amount: 14.8106,
  outcome_currency: "trx",
  payment_extra_ids: null,
  fee: {
    currency: "btc",
    depositFee: 0.09853637216235617,
    withdrawalFee: 0,
    serviceFee: 0
  }
}
```

## 🧪 Testing

### Run Test Suite
```bash
pnpm -F @projectfe/example-web test:webhook
```

This sends mock webhooks for:
- ✅ Finished payments
- ✅ Failed payments
- ✅ Expired payments
- ✅ Partially paid
- ✅ Refunds
- ✅ Invalid signatures

### Manual Testing
```bash
# Send a single test webhook
curl -X POST http://localhost:3000/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: YOUR_SIGNATURE" \
  -d @test-payload.json
```

## 🔒 Security

- **Signature Verification**: All webhooks verified with HMAC-SHA512
- **Type Validation**: Zod schemas ensure payload integrity
- **Error Handling**: Safe error responses without leaking details
- **HTTPS Required**: Production webhooks require HTTPS

## 🎯 Next Steps

1. ✅ **Review Documentation**: Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. ✅ **Test Locally**: Run the test script
3. ✅ **Customize Handlers**: Add your business logic
4. ✅ **Configure Dashboard**: Set webhook URL in NowPayments
5. ✅ **Deploy**: Use [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

## 💡 Example Usage

```typescript
import { NowPaymentsProvider } from "@projectfe/payments";
import type { NowPaymentsIPNPayload } from "@projectfe/payments";

// Initialize provider
const provider = new NowPaymentsProvider();
provider.initialize({
  apiKey: env.NOWPAYMENTS_API_KEY,
  webhookSecret: env.NOWPAYMENTS_IPN_SECRET,
  sandboxMode: env.NODE_ENV !== "production",
});

// In your webhook handler
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);
  
  const verification = await provider.verifyWebhook(body, headers);
  
  if (!verification.valid) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }
  
  const payload = verification.event!.rawPayload as unknown as NowPaymentsIPNPayload;
  
  // Handle based on status
  if (payload.payment_status === "finished") {
    await handleFinishedPayment(payload);
  }
  
  return NextResponse.json({ received: true });
}
```

## 📞 Support

- **NowPayments Docs**: https://documenter.getpostman.com/view/7907941/2s93JusNJt
- **IPN Setup Guide**: https://nowpayments.io/help/how-to-set-up-ipn
- **Support Email**: support@nowpayments.io

## 🐛 Troubleshooting

See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#-troubleshooting) for common issues and solutions.

## 📝 License

See project license file.

---

**Status**: ✅ Ready to Use

**Last Updated**: 2025-12-26

**Contributors**: AI Assistant

---

## 🎉 You're All Set!

Your NowPayments webhook integration is complete and ready to use. Start by running:

```bash
pnpm dev:example-web
```

Then in another terminal:

```bash
pnpm -F @projectfe/example-web test:webhook
```

Happy coding! 🚀

