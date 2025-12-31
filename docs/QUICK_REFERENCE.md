# NowPayments Webhook Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Environment Setup
```bash
# Add to apps/example-web/.env.local
NOWPAYMENTS_API_KEY=your_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
```

### 2. Test Locally
```bash
# Terminal 1
pnpm dev:example-web

# Terminal 2
pnpm -F @projectfe/example-web test:webhook
```

### 3. Configure NowPayments
- Dashboard URL: https://account.nowpayments.io/
- Go to: Settings → IPN Settings
- Set URL: `https://yourdomain.com/api/webhooks/nowpayments`

---

## 📊 Payment Status Reference

| Status | Description | Action Needed |
|--------|-------------|---------------|
| `waiting` | Waiting for payment | 👀 Monitor |
| `confirming` | Being confirmed | 👀 Monitor |
| `confirmed` | Confirmed | 👀 Monitor |
| `sending` | Being sent | 👀 Monitor |
| `finished` | ✅ **Completed** | 🎉 **Fulfill order** |
| `partially_paid` | Partial payment | 🤔 Decide action |
| `failed` | Failed | ❌ Notify user |
| `expired` | Expired | ⏰ Clean up |
| `refunded` | Refunded | 💰 Reverse |

---

## 🔑 Key Fields in Webhook

```typescript
{
  payment_id: number,           // Unique payment ID
  payment_status: string,       // Status from table above
  purchase_id: string,          // Your order/purchase ID
  
  // Amount info
  price_amount: number,         // Original price
  price_currency: string,       // Original currency (e.g., "usd")
  actually_paid: number,        // Amount paid in crypto
  pay_currency: string,         // Crypto used (e.g., "btc")
  
  // After fees
  outcome_amount: number,       // Amount you receive
  outcome_currency: string,     // Currency you receive
  
  // Fees
  fee: {
    currency: string,
    depositFee: number,
    withdrawalFee: number,
    serviceFee: number
  }
}
```

---

## 🛠️ Common Tasks

### Handle Completed Payment
```typescript
function handleFinishedPayment(payload: NowPaymentsIPNPayload): void {
  // 1. Update database
  // 2. Fulfill order
  // 3. Send confirmation email
  // 4. Update user credits
}
```

### Calculate Net Amount
```typescript
const totalFees = 
  (payload.fee?.depositFee ?? 0) +
  (payload.fee?.withdrawalFee ?? 0) +
  (payload.fee?.serviceFee ?? 0);

const netAmount = payload.outcome_amount;
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `apps/example-web/src/app/api/webhooks/nowpayments/route.ts` | Webhook handler |
| `apps/example-web/test-nowpayments-webhook.ts` | Test script |
| `apps/example-web/WEBHOOK_GUIDE.md` | Full guide |
| `packages/payments/src/providers/nowpayments/types.ts` | Type definitions |

---

## 🧪 Testing Commands

```bash
# Start dev server
pnpm dev:example-web

# Run webhook tests
pnpm -F @projectfe/example-web test:webhook

# Or directly with tsx
cd apps/example-web
pnpm tsx test-nowpayments-webhook.ts
```

---

## 🐛 Troubleshooting

### Webhook not received
✅ Check URL in NowPayments dashboard  
✅ Use HTTPS in production  
✅ Verify port is accessible  

### Signature fails
✅ Check IPN_SECRET is correct  
✅ Verify using right environment (sandbox/prod)  

### Type errors
✅ Run `pnpm install`  
✅ Check types are exported in `packages/payments/src/index.ts`  

---

## 🔒 Security Checklist

- ✅ Webhook signature verification enabled
- ✅ HTTPS in production
- ✅ Environment variables secured
- ✅ Idempotent webhook processing
- ✅ Error logging enabled

---

## 📞 Support

- **NowPayments Docs**: https://documenter.getpostman.com/view/7907941/2s93JusNJt
- **IPN Guide**: https://nowpayments.io/help/how-to-set-up-ipn
- **Support Email**: support@nowpayments.io

---

## ⚡ Pro Tips

1. **Always verify signatures** in production
2. **Handle webhooks idempotently** (you may receive duplicates)
3. **Return 200 OK quickly** (process async if needed)
4. **Log all webhooks** for debugging
5. **Test with sandbox first** before going live

---

**Ready to go? Run `pnpm dev:example-web` and `pnpm -F @projectfe/example-web test:webhook`** 🚀

