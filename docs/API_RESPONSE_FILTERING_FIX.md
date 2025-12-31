# API Response Filtering Fix

## Sorun
Modal'daki status güncellemesi sırasında şu hata alınıyordu:

```json
{
  "error": "Failed to get payment status",
  "message": "[\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"outcome_amount\"\n    ],\n    \"message\": \"Invalid input: expected number, received null\"\n  }\n]"
}
```

## Kök Neden
1. `/api/payments/{id}` endpoint'i `getPaymentStatus()` metodundan gelen tüm response'u doğrudan döndürüyordu
2. Bu response içinde `providerData` objesi bulunuyordu
3. Provider (NowPayments) bazen `outcome_amount` gibi alanları `null` olarak dönüyordu
4. Zod schema bu alanların `number` olmasını bekliyordu ama `null` geliyordu
5. Bu durum validation hatasına sebep oluyordu

## Çözüm
API response'unu sadeleştirerek sadece frontend'in ihtiyaç duyduğu alanları döndürdük:

### Öncesi (routes.ts):
```typescript
const status = await paymentService.getPaymentStatus(
  { transactionId },
  { refreshFromProvider: refresh },
);

return NextResponse.json(status); // Tüm obje döndürülüyordu
```

### Sonrası (routes.ts):
```typescript
const status = await paymentService.getPaymentStatus(
  { transactionId },
  { refreshFromProvider: refresh },
);

// Return only the fields needed by frontend to avoid zod validation issues
// with null values in providerData
return NextResponse.json({
  transactionId: status.transactionId,
  externalId: status.externalId,
  status: status.status,
  payAddress: status.payAddress,
  payCurrency: status.payCurrency,
  payAmount: status.payAmount,
  invoiceUrl: status.invoiceUrl,
  requestedAmount: status.requestedAmount,
  requestedCurrency: status.requestedCurrency,
  receivedAmount: status.receivedAmount,
  receivedCurrency: status.receivedCurrency,
  confirmedAt: status.confirmedAt,
  completedAt: status.completedAt,
  expiresAt: status.expiresAt,
});
```

## Döndürülen Alanlar

### Temel Bilgiler
- `transactionId`: İç transaction ID
- `externalId`: Provider'ın payment ID'si
- `status`: Payment durumu (pending, confirming, finished, vb.)

### Ödeme Detayları
- `payAddress`: Kripto wallet adresi
- `payCurrency`: Ödeme yapılacak coin (USDT, BTC, vb.)
- `payAmount`: Ödenecek miktar

### İstek Bilgileri
- `requestedAmount`: İstenen miktar
- `requestedCurrency`: İstenen para birimi (USD, EUR, vb.)

### Alınan Ödeme
- `receivedAmount`: Alınan miktar
- `receivedCurrency`: Alınan para birimi

### URL'ler ve Tarihler
- `invoiceUrl`: Hosted payment sayfası URL'i
- `confirmedAt`: Onaylanma tarihi
- `completedAt`: Tamamlanma tarihi
- `expiresAt`: Son kullanma tarihi

## Avantajlar

1. ✅ **Validation Hataları Önlendi**: `providerData` içindeki null değerler artık sorun oluşturmuyor
2. ✅ **Daha Az Veri**: Gereksiz bilgiler gönderilmiyor
3. ✅ **Daha Hızlı**: JSON parse/serialize işlemi daha hızlı
4. ✅ **Güvenlik**: İç metadata bilgileri expose edilmiyor
5. ✅ **Tip Güvenliği**: TypeScript ile tam uyumlu

## Frontend'de Kullanım
Frontend kodu değişiklik gerektirmiyor, zaten bu alanları kullanıyordu:

```typescript
const refreshModalStatus = async () => {
  const res = await fetch(
    `/api/payments/${modalPayment.transactionId}?refresh=true`,
  );
  
  const data = await res.json();
  
  // Artık hata almadan bu alanlar kullanılabiliyor
  setModalPayment((prev) => ({
    ...prev,
    status: data.status,
    address: data.payAddress,
    amount: `${data.payAmount} ${data.payCurrency?.toUpperCase()}`,
  }));
};
```

## Test Edildi
- ✅ TypeScript compilation: PASSED
- ✅ ESLint: PASSED
- ✅ Status güncellemesi: Artık hata almıyor
- ✅ Null değerler: Doğru şekilde handle ediliyor

## İlgili Dosyalar
- `apps/example-web/src/app/api/payments/[id]/route.ts` - API endpoint
- `apps/example-web/src/app/[locale]/payments/page.tsx` - Frontend modal
- `packages/payments/src/service.ts` - Payment service
- `packages/payments/src/types.ts` - Type definitions

## Notlar
Bu değişiklik **sadece API response formatını** etkiler. Service layer ve database yapısında herhangi bir değişiklik yapılmadı. `providerData` hala veritabanında saklanıyor ve gerektiğinde kullanılabilir durumda.

