"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type PaymentProvider = "nowpayments" | "paypal";
type PaymentStatus =
  | "pending"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

interface Payment {
  id: number;
  idempotencyKey: string;
  externalId: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
  requestedAmount: string;
  requestedCurrency: string;
  ipnCallbackUrl: string | null;
  orderId: string | null;
  orderDescription: string | null;
  receivedAmount: string | null;
  payAddress: string | null;
  payCurrency: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookLog {
  id: number;
  provider: PaymentProvider;
  externalId: string | null;
  eventType: string | null;
  processed: boolean;
  signatureValid: boolean | null;
  error: string | null;
  createdAt: string;
}

const statusColors: Record<PaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirming: "bg-blue-100 text-blue-800",
  confirmed: "bg-blue-200 text-blue-900",
  sending: "bg-purple-100 text-purple-800",
  partially_paid: "bg-orange-100 text-orange-800",
  finished: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
  expired: "bg-gray-200 text-gray-600",
};

export default function PaymentsTestPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalPayment, setModalPayment] = useState<{
    transactionId: number;
    orderId: string;
    price: string;
    amount: string;
    address: string;
    status: string;
    invoiceUrl: string;
  } | null>(null);

  // Origin URL for webhooks (client-side only)
  const [origin, setOrigin] = useState<string>("");

  // Currencies from NowPayments API
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Form state
  const [provider, setProvider] = useState<PaymentProvider>("nowpayments");
  const [amount, setAmount] = useState("10");
  const [currency, setCurrency] = useState("USD");
  const [payCurrency, setPayCurrency] = useState("BTC");
  const [orderId, setOrderId] = useState("");
  const [orderDescription, setOrderDescription] = useState("Test payment");
  const [ipnCallbackUrl, setIpnCallbackUrl] = useState(
    "https://deploy-test-example-web.vercel.app/api/callbacks/nowpayments",
  );

  // Filter state
  const [filterProvider, setFilterProvider] = useState<PaymentProvider | "">(
    "",
  );
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "">("");

  // Fetch available currencies from NowPayments API
  useEffect(() => {
    const fetchCurrencies = async () => {
      console.log("🔄 Fetching currencies from NowPayments API...");
      setLoadingCurrencies(true);
      try {
        const response = await fetch(
          "https://api.nowpayments.io/v1/currencies?fixed_rate=true",
          {
            method: "GET",
            headers: {
              "x-api-key": "1PPFKZP-D0EMK64-PF4PJGM-T66498W",
            },
          },
        );
        console.log("📡 API Response status:", response.status);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data: unknown = await response.json();
        const dataTyped = data as { currencies?: unknown[] };
        console.log("📦 API Response data:", data);
        console.log(
          "📦 Type of first currency:",
          typeof dataTyped.currencies?.[0],
        );
        console.log("📦 First currency value:", dataTyped.currencies?.[0]);
        console.log(
          "📦 First 3 raw currencies:",
          dataTyped.currencies?.slice(0, 3),
        );

        if (dataTyped.currencies && Array.isArray(dataTyped.currencies)) {
          // Extract currency codes from objects
          const validCurrencies = dataTyped.currencies
            .map((curr: unknown) => {
              // If it's an object, try to get code, ticker, or symbol property
              if (curr && typeof curr === "object") {
                const currObj = curr as Record<string, unknown>;
                return (currObj.code ??
                  currObj.ticker ??
                  currObj.symbol ??
                  currObj.currency ??
                  "") as string;
              }
              // If it's already a string
              if (typeof curr === "string") return curr;
              return "";
            })
            .filter((curr: string) => curr && curr.length > 0)
            .map((curr: string) => curr.toLowerCase());

          // Sort currencies alphabetically
          const sortedCurrencies = [...validCurrencies].sort();

          setAvailableCurrencies(sortedCurrencies);
        } else {
          console.warn("⚠️ Invalid data format from API");
          throw new Error("Invalid data format");
        }
      } catch (err) {
        console.error("❌ Failed to fetch currencies:", err);
        // Fallback to default currencies if API fails
        const fallback = [
          "BTC",
          "ETH",
          "USDT",
          "LTC",
          "TRX",
          "BNB",
          "DOGE",
          "ADA",
          "DOT",
          "MATIC",
        ];
        console.log("🔄 Using fallback currencies:", fallback);
        setAvailableCurrencies(fallback);
      } finally {
        setLoadingCurrencies(false);
        console.log("✨ Currency loading complete");
      }
    };

    void fetchCurrencies();
  }, []);

  // Set origin on mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProvider) params.set("provider", filterProvider);
      if (filterStatus) params.set("status", filterStatus);
      params.set("limit", "20");

      const res = await fetch(`/api/payments?${params.toString()}`);
      const data: unknown = await res.json();
      const dataTyped = data as { payments?: Payment[] };
      if (dataTyped.payments) {
        setPayments(dataTyped.payments);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    }
  }, [filterProvider, filterStatus]);

  const fetchWebhookLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProvider) params.set("provider", filterProvider);
      params.set("limit", "20");

      const res = await fetch(`/api/webhooks/logs?${params.toString()}`);
      const data: unknown = await res.json();
      const dataTyped = data as { logs?: WebhookLog[] };
      if (dataTyped.logs) {
        setWebhookLogs(dataTyped.logs);
      }
    } catch (err) {
      console.error("Failed to fetch webhook logs:", err);
    }
  }, [filterProvider]);

  useEffect(() => {
    void fetchPayments();
    void fetchWebhookLogs();
  }, [fetchPayments, fetchWebhookLogs]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchPayments();
      void fetchWebhookLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPayments, fetchWebhookLogs]);

  // Auto-refresh modal payment status every 2 seconds
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

        const data: unknown = await res.json();
        const dataTyped = data as {
          status?: string;
          payAddress?: string;
          payCurrency?: string;
          payAmount?: string;
        };

        if (dataTyped.status) {
          setModalPayment((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: dataTyped.status ?? prev.status,
              address: dataTyped.payAddress ?? prev.address,
              amount: dataTyped.payAmount
                ? `${dataTyped.payAmount} ${dataTyped.payCurrency?.toUpperCase() ?? ""}`
                : prev.amount,
            };
          });
        }
      } catch (err) {
        console.error("Failed to refresh modal payment status:", err);
      }
    };

    // Set up interval for refreshing every 10 seconds
    const interval = setInterval(() => {
      void refreshModalStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [showModal, modalPayment?.transactionId]);

  const createPayment = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        },
        body: JSON.stringify({
          provider,
          amount: parseFloat(amount),
          currency,
          payCurrency: provider === "nowpayments" ? payCurrency : undefined,
          orderId: orderId || undefined,
          orderDescription,
          ipnCallbackUrl: ipnCallbackUrl || undefined,
          successUrl: window.location.origin + "/payments/success",
          cancelUrl: window.location.origin + "/payments/cancel",
        }),
      });

      const data: unknown = await res.json();
      const dataTyped = data as {
        message?: string;
        error?: string;
        transactionId?: number;
        invoiceUrl?: string;
        payAddress?: string;
        payCurrency?: string;
        payAmount?: number;
        status?: string;
      };

      if (!res.ok) {
        throw new Error(
          dataTyped.message ?? dataTyped.error ?? "Failed to create payment",
        );
      }

      setSuccess(
        `Payment created! ID: ${dataTyped.transactionId ?? "unknown"}`,
      );

      // Show modal with payment details
      if (dataTyped.payAddress || dataTyped.invoiceUrl) {
        setModalPayment({
          transactionId: dataTyped.transactionId ?? 0,
          orderId: dataTyped.transactionId?.toString() ?? "N/A",
          price: `${amount} ${currency}`,
          amount: dataTyped.payAmount
            ? `${dataTyped.payAmount} ${dataTyped.payCurrency?.toUpperCase() ?? ""}`
            : "N/A",
          address: dataTyped.payAddress ?? "",
          status: dataTyped.status ?? "pending",
          invoiceUrl: dataTyped.invoiceUrl ?? "",
        });
        setShowModal(true);
      }

      void fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const refreshPayment = async (id: number) => {
    try {
      const res = await fetch(`/api/payments/${id}?refresh=true`);
      const data: unknown = await res.json();
      const dataTyped = data as { message?: string; status?: string };

      if (!res.ok) {
        throw new Error(dataTyped.message ?? "Failed to refresh");
      }

      setSuccess(`Payment ${id} status: ${dataTyped.status ?? "unknown"}`);
      void fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const triggerCronCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/check-payments");
      const data: unknown = await res.json();
      const dataTyped = data as { checked?: number; updated?: number };
      setSuccess(
        `Cron check complete: ${dataTyped.checked ?? 0} checked, ${dataTyped.updated ?? 0} updated`,
      );
      void fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const triggerTestWebhook = async (status: PaymentStatus = "finished") => {
    setLoading(true);
    setError(null);
    try {
      // Fake webhook payload matching the generated test data
      const payload = {
        payment_id: 123456789,
        parent_payment_id: 987654321,
        invoice_id: null,
        payment_status: status,
        pay_address: "address",
        payin_extra_id: null,
        price_amount: 1,
        price_currency: "usd",
        pay_amount: 15,
        actually_paid: status === "finished" ? 15 : 0,
        actually_paid_at_fiat: status === "finished" ? 0 : 0,
        pay_currency: "trx",
        order_id: null,
        order_description: null,
        purchase_id: "123456789",
        outcome_amount: status === "finished" ? 14.8106 : 0,
        outcome_currency: "trx",
        payment_extra_ids: null,
        fee:
          status === "finished"
            ? {
                currency: "btc",
                depositFee: 0.09853637216235617,
                withdrawalFee: 0,
                serviceFee: 0,
              }
            : undefined,
      };

      // Generate signature using helper endpoint
      const signatureRes = await fetch("/api/webhooks/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      });

      if (!signatureRes.ok) {
        throw new Error("Failed to generate webhook signature");
      }

      const signatureData: unknown = await signatureRes.json();
      const { signature } = signatureData as { signature: string };

      // Send webhook with signature
      const res = await fetch("/api/webhooks/nowpayments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nowpayments-sig": signature,
        },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json();
      const dataTyped = data as { message?: string; error?: string };

      if (res.ok) {
        setSuccess(`Test webhook (${status}) triggered successfully!`);
      } else {
        setError(
          `Webhook failed: ${dataTyped.message ?? dataTyped.error ?? "Unknown error"}`,
        );
      }

      // Refresh data after webhook
      setTimeout(() => {
        void fetchPayments();
        void fetchWebhookLogs();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Payment Gateway Test Dashboard
        </h1>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            <strong>Error:</strong> {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
            <strong>Success:</strong> {success}
            <button
              onClick={() => setSuccess(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Payment Form */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Create Test Payment</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as PaymentProvider)
                  }
                  className="w-full rounded border p-2"
                >
                  <option value="nowpayments">NowPayments (Crypto)</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded border p-2"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded border p-2"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {provider === "nowpayments" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Pay Currency (Crypto)
                    {loadingCurrencies && (
                      <span className="ml-2 text-xs text-gray-500">
                        Loading...
                      </span>
                    )}
                  </label>
                  <select
                    value={payCurrency}
                    onChange={(e) => setPayCurrency(e.target.value)}
                    className="w-full rounded border p-2"
                    disabled={loadingCurrencies}
                  >
                    <option value="">Any (user choice)</option>
                    {availableCurrencies.map((curr) => {
                      const currencyCode = String(curr).toLowerCase();
                      return (
                        <option key={currencyCode} value={currencyCode}>
                          {currencyCode.toUpperCase()}
                        </option>
                      );
                    })}
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    {loadingCurrencies ? (
                      <span>⏳ Loading currencies...</span>
                    ) : availableCurrencies.length > 0 ? (
                      <span>
                        ✅ {availableCurrencies.length} currencies available
                      </span>
                    ) : (
                      <span>❌ No currencies loaded</span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Order ID (optional)
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded border p-2"
                  placeholder="e.g., ORDER-123"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <input
                  type="text"
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  IPN Callback URL
                </label>
                <input
                  type="text"
                  value={ipnCallbackUrl}
                  onChange={(e) => setIpnCallbackUrl(e.target.value)}
                  className="w-full rounded border p-2"
                  placeholder="https://webhook.site/..."
                />
              </div>

              <button
                onClick={createPayment}
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Payment"}
              </button>
            </div>
          </div>

          {/* Actions Panel */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Actions & Filters</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Filter by Provider
                  </label>
                  <select
                    value={filterProvider}
                    onChange={(e) =>
                      setFilterProvider(e.target.value as PaymentProvider | "")
                    }
                    className="w-full rounded border p-2"
                  >
                    <option value="">All Providers</option>
                    <option value="nowpayments">NowPayments</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as PaymentStatus | "")
                    }
                    className="w-full rounded border p-2"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirming">Confirming</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="finished">Finished</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchPayments}
                  className="flex-1 rounded bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700"
                >
                  Refresh Data
                </button>
                <button
                  onClick={triggerCronCheck}
                  disabled={loading}
                  className="flex-1 rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Run Status Check
                </button>
              </div>

              <div className="rounded bg-gray-100 p-4">
                <h3 className="font-medium">Webhook URLs</h3>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>NowPayments IPN:</strong>
                  <br />
                  <code className="text-xs">
                    {origin || "[Your Domain]"}/api/webhooks/nowpayments
                  </code>
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>PayPal Webhook:</strong>
                  <br />
                  <code className="text-xs">
                    {origin || "[Your Domain]"}/api/callbacks/paypal
                  </code>
                </p>
              </div>

              {/* Webhook Testing Section */}
              <div className="rounded border-2 border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 font-medium text-blue-900">
                  🧪 Webhook Testing
                </h3>
                <p className="mb-3 text-xs text-blue-700">
                  Test webhook handling with fake payment data
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => triggerTestWebhook("finished")}
                    disabled={loading}
                    className="rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    ✅ Finished
                  </button>
                  <button
                    onClick={() => triggerTestWebhook("pending")}
                    disabled={loading}
                    className="rounded bg-yellow-600 px-3 py-2 text-xs font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                  >
                    ⏳ Pending
                  </button>
                  <button
                    onClick={() => triggerTestWebhook("partially_paid")}
                    disabled={loading}
                    className="rounded bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    💰 Partial
                  </button>
                  <button
                    onClick={() => triggerTestWebhook("failed")}
                    disabled={loading}
                    className="rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    ❌ Failed
                  </button>
                  <button
                    onClick={() => triggerTestWebhook("expired")}
                    disabled={loading}
                    className="rounded bg-gray-600 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    ⏰ Expired
                  </button>
                  <button
                    onClick={() => triggerTestWebhook("refunded")}
                    disabled={loading}
                    className="rounded bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    ↩️ Refunded
                  </button>
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  💡 Tip: Check Webhook Logs below to see processing results
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-600">Total Payments</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {payments.length}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-600">Finished</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {payments.filter((p) => p.status === "finished").length}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">
              {payments.filter((p) => p.status === "pending").length}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-600">Webhook Events</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {webhookLogs.length}
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Recent Payments ({payments.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">External ID</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{payment.id}</td>
                    <td className="px-4 py-3 capitalize">{payment.provider}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${statusColors[payment.status]}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.requestedAmount} {payment.requestedCurrency}
                      {payment.receivedAmount && (
                        <span className="block text-xs text-gray-500">
                          Received: {payment.receivedAmount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.externalId?.substring(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => refreshPayment(payment.id)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                        >
                          Refresh
                        </button>
                        {payment.invoiceUrl && (
                          <a
                            href={payment.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                          >
                            Pay
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Logs Table */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Recent Webhook Logs ({webhookLogs.length})
            </h2>
            <button
              onClick={fetchWebhookLogs}
              className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
            >
              🔄 Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">External ID</th>
                  <th className="px-4 py-3">Processed</th>
                  <th className="px-4 py-3">Signature</th>
                  <th className="px-4 py-3">Error</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {webhookLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-gray-50 ${log.error ? "bg-red-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono">{log.id}</td>
                    <td className="px-4 py-3 capitalize">{log.provider}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.eventType ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.externalId?.substring(0, 12) ?? "-"}
                      {log.externalId && log.externalId.length > 12 && "..."}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          log.processed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {log.processed ? "✓ Yes" : "⏳ No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          log.signatureValid === null
                            ? "bg-gray-100 text-gray-600"
                            : log.signatureValid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.signatureValid === null
                          ? "N/A"
                          : log.signatureValid
                            ? "✓ Valid"
                            : "✗ Invalid"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.error ? (
                        <span
                          className="text-xs text-red-600"
                          title={log.error}
                        >
                          {log.error.substring(0, 30)}
                          {log.error.length > 30 && "..."}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {webhookLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No webhook logs found. Trigger a test webhook to see logs
                      appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {webhookLogs.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <div>Showing {webhookLogs.length} most recent logs</div>
              <div>
                ✓ Processed: {webhookLogs.filter((l) => l.processed).length} |
                ⏳ Pending: {webhookLogs.filter((l) => !l.processed).length} | ✗
                Errors: {webhookLogs.filter((l) => l.error).length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details Modal */}
      {showModal && modalPayment && (
        <div
          className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600"
            >
              ×
            </button>

            {/* Modal Header */}
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Order details
            </h2>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Details */}
              <div className="space-y-4">
                {/* Order Number */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Order:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      #{modalPayment.orderId}
                    </span>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          modalPayment.orderId,
                        );
                      }}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy order ID"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="text-sm text-gray-600">Price:</div>
                  <div className="font-semibold text-gray-900">
                    {modalPayment.price}
                  </div>
                </div>

                {/* Amount to Pay */}
                <div>
                  <div className="text-sm text-gray-600">Amount:</div>
                  <div className="font-semibold text-gray-900">
                    {modalPayment.amount}
                    <span className="ml-2 inline-block rounded bg-pink-100 px-2 py-1 text-xs font-medium text-pink-700">
                      POLYGON
                    </span>
                  </div>
                </div>

                {/* Wallet Address */}
                {modalPayment.address && (
                  <div>
                    <div className="text-sm text-gray-600">Address:</div>
                    <div className="font-mono text-xs break-all text-gray-900">
                      {modalPayment.address}
                    </div>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          modalPayment.address,
                        );
                      }}
                      className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column - QR Code */}
              <div className="flex flex-col items-center justify-start">
                {modalPayment.address ? (
                  <div className="rounded-lg border-2 border-gray-200 bg-white p-3">
                    <QRCodeSVG
                      value={modalPayment.address}
                      size={150}
                      level="M"
                    />
                  </div>
                ) : (
                  <div className="flex h-[170px] w-[170px] items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-500">
                      No QR available
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 flex items-center gap-2">
              <span className="text-sm text-gray-600">Status:</span>
              <span
                className={`rounded px-2 py-1 text-sm font-medium transition-all duration-300 ${
                  modalPayment.status === "finished"
                    ? "bg-green-100 text-green-800"
                    : modalPayment.status === "confirmed"
                      ? "bg-blue-200 text-blue-900"
                      : modalPayment.status === "confirming"
                        ? "bg-blue-100 text-blue-800"
                        : modalPayment.status === "partially_paid"
                          ? "bg-orange-100 text-orange-800"
                          : modalPayment.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : modalPayment.status === "expired"
                              ? "bg-gray-200 text-gray-600"
                              : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {modalPayment.status === "pending"
                  ? "Waiting"
                  : modalPayment.status === "confirming"
                    ? "Confirming"
                    : modalPayment.status === "confirmed"
                      ? "Confirmed"
                      : modalPayment.status === "partially_paid"
                        ? "Partially Paid"
                        : modalPayment.status === "finished"
                          ? "Finished ✓"
                          : modalPayment.status === "failed"
                            ? "Failed ✗"
                            : modalPayment.status === "expired"
                              ? "Expired"
                              : modalPayment.status}
              </span>
              <span
                className="text-xs text-gray-400"
                title="Auto-refreshing every 10 seconds"
              >
                🔄
              </span>
            </div>

            {/* Payment Link */}
            {modalPayment.invoiceUrl && (
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  Share a permanent link to a hosted page:
                </div>
                <a
                  href={modalPayment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-sm break-all text-blue-600 hover:text-blue-700"
                >
                  {modalPayment.invoiceUrl}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      void navigator.clipboard.writeText(
                        modalPayment.invoiceUrl,
                      );
                    }}
                    className="text-blue-600 hover:text-blue-700"
                    title="Copy link"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {modalPayment.invoiceUrl && (
                <a
                  href={modalPayment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
                >
                  Open Payment Page
                </a>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="rounded bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
