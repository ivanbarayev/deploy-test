# Modal Status Auto-Refresh Implementation

## Özet
Modal açıkken payment status'u otomatik olarak her 2 saniyede bir güncellenir.

## İmplementasyon Detayları

### 1. Modal State Güncelleme
Modal state'e `transactionId` eklendi:
```typescript
const [modalPayment, setModalPayment] = useState<{
  transactionId: number;  // YENI EKLENEN
  orderId: string;
  price: string;
  amount: string;
  address: string;
  status: string;
  invoiceUrl: string;
} | null>(null);
```

### 2. Auto-Refresh useEffect Hook
Modal açıkken her 2 saniyede bir `/api/payments/{id}?refresh=true` endpoint'ine istek atan useEffect:

```typescript
useEffect(() => {
  if (!showModal || !modalPayment?.transactionId) {
    return;
  }

  const refreshModalStatus = async () => {
    try {
      const res = await fetch(
        `/api/payments/${modalPayment.transactionId}?refresh=true`,
      );
      
      if (!res.ok) {
        console.error("Failed to refresh payment status");
        return;
      }

      const data = await res.json();

      if (data.status) {
        setModalPayment((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status ?? prev.status,
            address: data.payAddress ?? prev.address,
            amount: data.payAmount
              ? `${data.payAmount} ${data.payCurrency?.toUpperCase() ?? ""}`
              : prev.amount,
          };
        });
      }
    } catch (err) {
      console.error("Failed to refresh modal payment status:", err);
    }
  };

  // İlk yükleme
  void refreshModalStatus();

  // Her 2 saniyede bir yenile
  const interval = setInterval(() => {
    void refreshModalStatus();
  }, 2000);

  return () => clearInterval(interval);
}, [showModal, modalPayment?.transactionId]);
```

### 3. Geliştirilmiş Status Gösterimi
Status artık tüm durumlar için uygun renklerle gösteriliyor:

- 🟢 **Finished** - Yeşil (✓ işareti ile)
- 🔵 **Confirmed** - Koyu mavi
- 🔵 **Confirming** - Açık mavi
- 🟠 **Partially Paid** - Turuncu
- 🔴 **Failed** - Kırmızı (✗ işareti ile)
- ⚪ **Expired** - Gri
- 🟡 **Pending/Waiting** - Sarı

Status yanında 🔄 ikonu otomatik yenilenme olduğunu gösterir.

### 4. Transition Animasyonu
Status değiştiğinde smooth geçiş animasyonu:
```css
transition-all duration-300
```

## Çalışma Mantığı

1. **Modal Açıldığında**:
   - useEffect hook aktif olur
   - Hemen ilk status güncellemesi yapılır
   - 2 saniye interval başlatılır

2. **Her 2 Saniyede**:
   - `/api/payments/{id}?refresh=true` endpoint'ine GET isteği
   - Provider'dan güncel status çekilir
   - Modal state güncellenir
   - UI otomatik olarak yenilenir

3. **Modal Kapandığında**:
   - useEffect cleanup fonksiyonu çalışır
   - Interval temizlenir
   - Artık istek gönderilmez

## Test Etme

1. Payment oluştur ve modal'ı aç
2. Console'da her 2 saniyede bir istek gittiğini gör
3. Status değişimlerini gözlemle (örn: pending → confirming → confirmed → finished)
4. Modal'ı kapat ve isteklerin durduğunu doğrula

## API Endpoint Kullanımı

**Endpoint**: `GET /api/payments/{id}?refresh=true`

**Parametreler**:
- `id`: Transaction ID (path parameter)
- `refresh=true`: Provider'dan güncel veri çek (query parameter)

**Response**:
```json
{
  "transactionId": 123,
  "status": "confirming",
  "payAddress": "0xF...",
  "payCurrency": "USDT",
  "payAmount": "0.997725"
}
```

## Performans Notları

- ✅ Sadece modal açıkken çalışır (gereksiz istek yok)
- ✅ Modal kapandığında interval temizlenir
- ✅ 2 saniyelik interval performans için yeterli
- ✅ Hata durumunda sadece console'a log atar, crash olmaz
- ✅ `refresh=true` parametresi ile her zaman güncel veri

## Gelecek İyileştirmeler

1. **Loading Indicator**: Status yenilenirken küçük spinner
2. **Success Animation**: Status "finished" olduğunda confetti
3. **WebSocket**: Daha real-time güncellemeler için
4. **Bildirim**: Status değiştiğinde toast notification
5. **Ses**: Ödeme tamamlandığında ses efekti

