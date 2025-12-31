# Swagger Annotation - Hızlı Referans

## 📝 Yeni Endpoint Eklerken

### 1. Basit Endpoint (Schema Gerekmeyen)

```typescript
/**
 * @swagger
 * /api/my-endpoint:
 *   get:
 *     summary: Kısa açıklama
 *     tags: [MyTag]
 *     responses:
 *       200:
 *         description: Başarılı
 */
```

### 2. Mevcut Schema Kullanan Endpoint

```typescript
/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create payment
 *     tags: [Payments]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
```

### 3. Yeni Schema Gerekirse

**Önce** `src/lib/openapi.ts`'e ekle:

```typescript
components: {
  schemas: {
    // ...existing schemas...
    YeniSchema: {
      type: "object",
      required: ["field1", "field2"],
      properties: {
        field1: {
          type: "string",
          description: "Alan 1",
        },
        field2: {
          type: "number",
          minimum: 0,
        },
      },
    },
  },
}
```

**Sonra** route'da kullan:

```typescript
schema:
  $ref: '#/components/schemas/YeniSchema'
```

## 🎯 Kompakt Syntax Örnekleri

### Property Tanımlama

```typescript
// ❌ Uzun yol
properties:
  name:
    type: string
    description: User name
    example: John

// ✅ Kısa yol
properties:
  name: {type: string, description: "User name", example: "John"}
```

### Parameters

```typescript
// ✅ Kompakt
parameters:
  - in: query
    name: page
    schema: {type: integer, default: 1}
  - in: query
    name: limit
    schema: {type: integer, default: 10, maximum: 100}
```

### Tags

```typescript
// ❌ Uzun
tags:
  - Payments
  - Admin

// ✅ Kısa
tags: [Payments, Admin]
```

### Enum

```typescript
// ✅ Kompakt
status: {type: string, enum: [pending, completed, failed]}
```

## 📦 Mevcut Schema'lar

### Request Schemas
- `CreatePaymentRequest` - Ödeme oluşturma
- `NowPaymentsWebhookPayload` - NowPayments webhook

### Response Schemas
- `PaymentResponse` - Tek ödeme response
- `PaymentListResponse` - Ödeme listesi
- `WebhookResponse` - Webhook response
- `ErrorResponse` - Genel hata
- `ValidationErrorResponse` - Validasyon hatası

### Reusable Responses
- `BadRequest` - 400 hatası
- `Unauthorized` - 401 hatası
- `NotFound` - 404 hatası
- `ServerError` - 500 hatası

## 🔄 Kullanım Örnekleri

### GET with Query Params

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: List items
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: {type: string}
 *       - in: query
 *         name: page
 *         schema: {type: integer, default: 1}
 *     responses:
 *       200:
 *         description: Items list
 */
```

### POST with Body

```typescript
/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create item
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: {type: string}
 *               price: {type: number}
 *     responses:
 *       201:
 *         description: Item created
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
```

### GET with Path Param

```typescript
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get item
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
```

### Protected Endpoint

```typescript
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
```

### Multiple HTTP Methods

```typescript
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get item
 *     tags: [Items]
 *     responses:
 *       200:
 *         description: Item details
 *   put:
 *     summary: Update item
 *     tags: [Items]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: {type: object}
 *     responses:
 *       200:
 *         description: Item updated
 *   delete:
 *     summary: Delete item
 *     tags: [Items]
 *     responses:
 *       204:
 *         description: Item deleted
 */
```

## 🎨 Schema Detayları

### Basit Object

```typescript
MySchema: {
  type: "object",
  properties: {
    id: {type: "string"},
    name: {type: "string"},
    age: {type: "number"},
  },
}
```

### Required Fields

```typescript
MySchema: {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: {type: "string"},
    name: {type: "string"},
    age: {type: "number"}, // optional
  },
}
```

### Nested Object

```typescript
UserSchema: {
  type: "object",
  properties: {
    name: {type: "string"},
    address: {
      type: "object",
      properties: {
        street: {type: "string"},
        city: {type: "string"},
      },
    },
  },
}
```

### Array

```typescript
UsersResponse: {
  type: "object",
  properties: {
    users: {
      type: "array",
      items: {
        $ref: "#/components/schemas/User",
      },
    },
  },
}
```

### Enum

```typescript
StatusSchema: {
  type: "string",
  enum: ["pending", "active", "completed"],
}
```

### With Validation

```typescript
AmountSchema: {
  type: "number",
  minimum: 0,
  maximum: 1000000,
  description: "Amount in USD",
  example: 99.99,
}
```

## 🔍 Debugging

### Swagger UI Görünmüyorsa

```bash
# Server'ı yeniden başlat
pnpm dev

# Browser'da kontrol et
http://localhost:3000/api/docs
```

### Schema Hataları

```bash
# OpenAPI spec'i kontrol et
curl http://localhost:3000/api/openapi.json | jq .

# Validation yap
npx swagger-cli validate openapi.json
```

### TypeScript Hataları

```bash
# Type check
pnpm typecheck

# Lint check
pnpm lint
```

## 📚 Daha Fazla Bilgi

- `SWAGGER_IMPLEMENTATION.md` - İlk kurulum
- `SWAGGER_REFACTORING_COMPLETE.md` - Refactoring özeti
- `API_SWAGGER_GUIDE.md` - Kullanıcı kılavuzu
- `/api/docs` - Canlı dokümantasyon

## ⚡ Hızlı Komutlar

```bash
# Dev server başlat
pnpm dev

# Swagger UI aç
open http://localhost:3000/api/docs

# Type check
pnpm typecheck

# Lint
pnpm lint

# OpenAPI spec indir
curl http://localhost:3000/api/openapi.json > openapi.json
```

---

**Not**: Tüm annotation'lar JSDoc formatında yazılmalı ve fonksiyon tanımından hemen önce olmalı.

