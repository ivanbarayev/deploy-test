import process from "node:process";

import type {
  BaseProviderConfig,
  CreatePaymentRequest,
  PaymentProvider,
  PaymentStatus,
  ProviderStatusResponse,
  WebhookVerificationResult,
} from "../../types";
import type {
  NowPaymentsConfig,
  NowPaymentsCreateInvoice,
  NowPaymentsCreatePayment,
  NowPaymentsIPNPayload,
} from "./types";
import { PaymentError, PaymentErrorCodes } from "../../types";
import {
  NowPaymentsCreateInvoiceSchema,
  NowPaymentsCreatePaymentSchema,
  NowPaymentsInvoiceResponseSchema,
  NowPaymentsIPNPayloadSchema,
  NowPaymentsPaymentResponseSchema,
  NowPaymentsStatuses,
  NowPaymentsStatusResponseSchema,
} from "./types";

/**
 * Base URL for NowPayments API
 */
const NOWPAYMENTS_API_URL =
  process.env.NOWPAYMENTS_API_URL ?? "https://api.nowpayments.io/v1";
const NOWPAYMENTS_SANDBOX_API_URL =
  process.env.NOWPAYMENTS_SANDBOX_API_URL ??
  "https://api-sandbox.nowpayments.io/v1";

/**
 * NowPayments payment provider implementation
 */
export class NowPaymentsProvider implements PaymentProvider {
  readonly name = "nowpayments" as const;

  private config: NowPaymentsConfig | null = null;
  private baseUrl: string = NOWPAYMENTS_API_URL;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: BaseProviderConfig): void {
    // Get sandbox mode from environment variable or fallback to config
    const sandboxMode =
      process.env.NOWPAYMENTS_SANDBOX === "true"
        ? true
        : process.env.NOWPAYMENTS_SANDBOX === "false"
          ? false
          : config.sandboxMode;

    this.config = {
      apiKey: process.env.NOWPAYMENTS_API_KEY ?? "",
      ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
      sandboxMode,
    };
    this.baseUrl = sandboxMode
      ? NOWPAYMENTS_SANDBOX_API_URL
      : NOWPAYMENTS_API_URL;
  }

  /**
   * Get the API headers
   */
  private getHeaders(): Record<string, string> {
    if (!this.config) {
      throw new PaymentError(
        "NowPayments provider not initialized",
        PaymentErrorCodes.PROVIDER_NOT_CONFIGURED,
        this.name,
      );
    }
    return {
      "x-api-key": this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Make an API request to NowPayments
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers ?? {}),
        },
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { message?: string };
        throw new PaymentError(
          errorData.message ?? `NowPayments API error : ${response.status}`,
          PaymentErrorCodes.PROVIDER_ERROR,
          this.name,
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `NowPayments API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        PaymentErrorCodes.PROVIDER_ERROR,
        this.name,
        error,
      );
    }
  }

  /**
   * Create a new payment
   */
  async createPayment(request: CreatePaymentRequest): Promise<{
    externalId: string;
    status: PaymentStatus;
    payAddress?: string;
    payCurrency?: string;
    payAmount?: number;
    invoiceUrl?: string;
    expiresAt?: Date;
    providerData?: Record<string, unknown>;
  }> {
    return this.createDirectPayment(request);
  }

  /**
   * Create a direct crypto payment (when pay currency is known)
   */
  private async createDirectPayment(request: CreatePaymentRequest): Promise<{
    externalId: string;
    status: PaymentStatus;
    payAddress?: string;
    payCurrency?: string;
    payAmount?: number;
    invoiceUrl?: string;
    expiresAt?: Date;
    providerData?: Record<string, unknown>;
  }> {
    const payload: NowPaymentsCreatePayment = {
      price_amount: request.amount,
      price_currency: request.currency,
      pay_currency: request.payCurrency,
      ipn_callback_url: request.ipnCallbackUrl,
      order_id: request.orderId ?? request.idempotencyKey,
      order_description: request.orderDescription,
      payout_address: request.outcomeAddress,
      payout_currency: request.outcomeCurrency,
    };

    // Add sandbox test case if in sandbox mode
    if (this.config?.sandboxMode && request.metadata?.testCase) {
      payload.case = request.metadata.testCase as "success" | "fail";
    }

    const validated = NowPaymentsCreatePaymentSchema.parse(payload);
    const response = await this.makeRequest<unknown>("/payment", {
      method: "POST",
      body: JSON.stringify(validated),
    });

    const parsed = NowPaymentsPaymentResponseSchema.parse(response);

    return {
      externalId: parsed.payment_id,
      status: this.mapStatus(parsed.payment_status),
      payAddress: parsed.pay_address,
      payCurrency: parsed.pay_currency,
      payAmount: parsed.pay_amount ?? undefined,
      expiresAt: parsed.expiration_estimate_date
        ? new Date(parsed.expiration_estimate_date)
        : undefined,
      providerData: response as Record<string, unknown>,
    };
  }

  /**
   * Create an invoice-based payment (hosted checkout)
   */
  private async createInvoicePayment(request: CreatePaymentRequest): Promise<{
    externalId: string;
    status: PaymentStatus;
    payAddress?: string;
    payCurrency?: string;
    payAmount?: number;
    invoiceUrl?: string;
    expiresAt?: Date;
    providerData?: Record<string, unknown>;
  }> {
    const payload: NowPaymentsCreateInvoice = {
      price_amount: request.amount,
      price_currency: request.currency,
      pay_currency: request.payCurrency,
      ipn_callback_url: request.ipnCallbackUrl,
      order_id: request.orderId ?? request.idempotencyKey,
      order_description: request.orderDescription,
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
    };

    const validated = NowPaymentsCreateInvoiceSchema.parse(payload);
    const response = await this.makeRequest<unknown>("/invoice", {
      method: "POST",
      body: JSON.stringify(validated),
    });

    const parsed = NowPaymentsInvoiceResponseSchema.parse(response);

    return {
      externalId: parsed.id,
      status: "pending" as PaymentStatus, // Invoices start as pending
      invoiceUrl: parsed.invoice_url,
      payCurrency: parsed.pay_currency,
      providerData: response as Record<string, unknown>,
    };
  }

  /**
   * Get payment status from NowPayments
   */
  async getPaymentStatus(externalId: string): Promise<ProviderStatusResponse> {
    const response = await this.makeRequest<unknown>(`/payment/${externalId}`);

    const parsed = NowPaymentsStatusResponseSchema.parse(response);

    return {
      externalId: parsed.payment_id,
      status: this.mapStatus(parsed.payment_status),
      actuallyPaid: parsed.actually_paid ?? undefined,
      payAmount: parsed.pay_amount ?? undefined,
      payCurrency: parsed.pay_currency ?? undefined,
      outcomeAmount: parsed.outcome_amount ?? undefined,
      outcomeCurrency: parsed.outcome_currency ?? undefined,
      rawData: response as Record<string, unknown>,
    };
  }

  /**
   * Verify webhook signature using HMAC-SHA512
   */
  async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret?: string,
  ): Promise<WebhookVerificationResult> {
    const ipnSecret = secret ?? this.config?.ipnSecret;
    const payloadString =
      typeof payload === "string" ? payload : payload.toString("utf-8");

    // Parse the payload
    let parsedPayload: NowPaymentsIPNPayload;
    try {
      const jsonPayload: unknown = JSON.parse(payloadString);
      parsedPayload = NowPaymentsIPNPayloadSchema.parse(jsonPayload);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid payload format: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }

    // If no secret configured, skip signature verification (not recommended for production)
    if (!ipnSecret) {
      console.warn(
        "NowPayments IPN secret not configured - skipping signature verification",
      );
      return {
        valid: true,
        event: {
          provider: this.name,
          eventType: parsedPayload.payment_status,
          externalId: parsedPayload.payment_id,
          status: this.mapStatus(parsedPayload.payment_status),
          actuallyPaid: parsedPayload.actually_paid ?? undefined,
          payAmount: parsedPayload.pay_amount ?? undefined,
          payCurrency: parsedPayload.pay_currency,
          outcomeAmount: parsedPayload.outcome_amount ?? undefined,
          outcomeCurrency: parsedPayload.outcome_currency,
          rawPayload: JSON.parse(payloadString) as Record<string, unknown>,
        },
      };
    }

    // Get the signature from headers
    const signature = headers["x-nowpayments-sig"];
    if (!signature || Array.isArray(signature)) {
      return {
        valid: false,
        error: "Missing or invalid x-nowpayments-sig header",
      };
    }

    // Verify HMAC-SHA512 signature
    // NowPayments sorts the JSON keys alphabetically before signing
    try {
      const crypto = await import("node:crypto");
      const jsonPayload: unknown = JSON.parse(payloadString);
      const sortedPayload = this.sortObject(
        jsonPayload as Record<string, unknown>,
      );
      const sortedPayloadString = JSON.stringify(sortedPayload);

      const hmac = crypto.createHmac("sha512", ipnSecret);
      hmac.update(sortedPayloadString);
      const calculatedSignature = hmac.digest("hex");

      if (calculatedSignature !== signature) {
        return {
          valid: false,
          error: "Signature verification failed",
        };
      }

      return {
        valid: true,
        event: {
          provider: this.name,
          eventType: parsedPayload.payment_status,
          externalId: parsedPayload.payment_id,
          status: this.mapStatus(parsedPayload.payment_status),
          actuallyPaid: parsedPayload.actually_paid ?? undefined,
          payAmount: parsedPayload.pay_amount ?? undefined,
          payCurrency: parsedPayload.pay_currency,
          outcomeAmount: parsedPayload.outcome_amount ?? undefined,
          outcomeCurrency: parsedPayload.outcome_currency,
          rawPayload: jsonPayload as Record<string, unknown>,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `Signature verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Sort object keys alphabetically (required for NowPayments signature)
   */
  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      const value = obj[key];
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        sorted[key] = this.sortObject(value as Record<string, unknown>);
      } else {
        sorted[key] = value;
      }
    }

    return sorted;
  }

  /**
   * Map NowPayments status to normalized status
   */
  mapStatus(providerStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      [NowPaymentsStatuses.WAITING]: "pending",
      [NowPaymentsStatuses.CONFIRMING]: "confirming",
      [NowPaymentsStatuses.CONFIRMED]: "confirmed",
      [NowPaymentsStatuses.SENDING]: "sending",
      [NowPaymentsStatuses.PARTIALLY_PAID]: "partially_paid",
      [NowPaymentsStatuses.FINISHED]: "finished",
      [NowPaymentsStatuses.FAILED]: "failed",
      [NowPaymentsStatuses.REFUNDED]: "refunded",
      [NowPaymentsStatuses.EXPIRED]: "expired",
    };

    return statusMap[providerStatus.toLowerCase()] ?? "pending";
  }

  /**
   * Get API status (health check)
   */
  async getAPIStatus(): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>("/status");
  }

  /**
   * Get available currencies
   */
  async getAvailableCurrencies(): Promise<string[]> {
    const response = await this.makeRequest<{ currencies: string[] }>(
      "/currencies",
    );
    return response.currencies;
  }

  /**
   * Get minimum payment amount for a currency
   */
  async getMinimumAmount(
    currencyFrom: string,
    currencyTo?: string,
  ): Promise<{ minAmount: number; fiatEquivalent?: number }> {
    const params = new URLSearchParams({ currency_from: currencyFrom });
    if (currencyTo) {
      params.append("currency_to", currencyTo);
    }

    const response = await this.makeRequest<{
      min_amount: number;
      fiat_equivalent?: number;
    }>(`/min-amount?${params.toString()}`);

    return {
      minAmount: response.min_amount,
      fiatEquivalent: response.fiat_equivalent,
    };
  }

  /**
   * Get estimated price for a payment
   */
  async getEstimatedPrice(
    amount: number,
    currencyFrom: string,
    currencyTo: string,
  ): Promise<{ estimatedAmount: number }> {
    const params = new URLSearchParams({
      amount: amount.toString(),
      currency_from: currencyFrom,
      currency_to: currencyTo,
    });

    const response = await this.makeRequest<{ estimated_amount: number }>(
      `/estimate?${params.toString()}`,
    );

    return { estimatedAmount: response.estimated_amount };
  }
}

// Default export for convenience
export const nowPaymentsProvider = new NowPaymentsProvider();
