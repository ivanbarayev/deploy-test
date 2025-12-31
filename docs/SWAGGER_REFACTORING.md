# Swagger Annotation Refactoring

## 🎯 Problem
Swagger annotation'ları çok uzundu ve her endpoint için schema'lar tekrar tekrar yazılıyordu.

## ✅ Çözüm
Schema'ları merkezi bir yerde tanımlayıp `$ref` ile referans verdik.

## 📦 Değişiklikler

### 1. Schema Tanımlamaları (`src/lib/openapi.ts`)

Tüm reusable schema'lar `components.schemas` içinde tanımlandı:

```typescript
components: {
  schemas: {
    CreatePaymentRequest: { /* detaylı schema */ },
    PaymentResponse: { /* detaylı schema */ },
    PaymentListResponse: { /* detaylı schema */ },
    Payment: { /* detaylı schema */ },
    ErrorResponse: { /* detaylı schema */ },
    ValidationErrorResponse: { /* detaylı schema */ }
  },
  responses: {
    BadRequest: { /* 400 response */ },
    ServerError: { /* 500 response */ },
    NotFound: { /* 404 response */ },
    Unauthorized: { /* 401 response */ }
  }
}
```

### 2. Kısaltılmış Annotation'lar

#### Önce (130 satır):
```typescript
/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Initiate a payment transaction...
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, amount, currency]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [nowpayments, paypal]
 *                 description: Payment provider to use
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Payment amount (must be positive)
 *                 example: 99.99
 *                 minimum: 0.01
 *               currency:
 *                 type: string
 *                 description: Currency code (ISO 4217)
 *               # ... 10+ daha fazla property
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: {type: string}
 *                 provider: {type: string}
 *                 # ... daha fazla property
 */
```

#### Sonra (27 satır - %79 azalma):
```typescript
/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Initiate a payment transaction with a specified provider
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema: {type: string}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
```

## 📊 Sonuçlar

### Dosya Boyutları
| Dosya | Önce | Sonra | Azalma |
|-------|------|-------|--------|
| `api/payments/route.ts` | 264 satır | 195 satır | **26% ↓** |
| `api/payments/[id]/route.ts` | 102 satır | 76 satır | **25% ↓** |
| `api/webhooks/sign/route.ts` | 118 satır | 92 satır | **22% ↓** |
| `api/webhooks/logs/route.ts` | 90 satır | 70 satır | **22% ↓** |

### Avantajları
✅ **DRY (Don't Repeat Yourself)** - Schema'lar tek yerde tanımlı  
✅ **Okunabilirlik** - Annotation'lar çok daha kısa ve anlaşılır  
✅ **Bakım** - Schema değişikliği tek yerden yapılıyor  
✅ **Tutarlılık** - Tüm endpoint'ler aynı schema'ları kullanıyor  
✅ **Tip Güvenliği** - Schema'lar merkezi olarak yönetiliyor  

## 🔧 Kullanım

### Yeni Endpoint Eklerken

1. **Eğer yeni bir schema gerekiyorsa**, `src/lib/openapi.ts`'e ekle:
```typescript
components: {
  schemas: {
    YeniSchema: {
      type: "object",
      properties: {
        // ...
      }
    }
  }
}
```

2. **Route dosyasında kısaca referans ver**:
```typescript
/**
 * @swagger
 * /api/yeni-endpoint:
 *   post:
 *     summary: Kısa açıklama
 *     tags: [Tag]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YeniSchema'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/Success'
 */
```

## 🎨 Best Practices

### ✅ YAP
- Tekrar eden schema'ları `components.schemas`'a al
- Standart response'lar için `components.responses` kullan
- Inline schema'ları kompakt syntax ile yaz: `{type: string}`
- Array tip'leri için: `[Tag1, Tag2]`

### ❌ YAPMA
- Aynı schema'yı birden fazla yerde tanımlama
- 50+ satır annotation yazmaya devam etme
- Her endpoint için aynı error response'ları tekrarla

## 📚 Referanslar

- **OpenAPI Spec**: http://localhost:3000/api/openapi.json
- **Swagger UI**: http://localhost:3000/api/docs
- **Schema Definitions**: `src/lib/openapi.ts` (components section)

## ✨ Gelecek İyileştirmeler

1. **Zod-to-OpenAPI**: Zod schema'larından otomatik OpenAPI generate et
2. **Schema Validator**: Runtime'da request/response validation
3. **Type Generation**: OpenAPI'dan TypeScript tip'leri generate et
4. **Mock Server**: Schema'lardan mock data üret

---

**Durum**: ✅ Tamamlandı  
**Tarih**: 2025-12-30  
**Test**: TypeScript ✅ | Lint ✅ | Swagger UI ✅

