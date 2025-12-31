import type { z } from "zod/v4";

import type {
  BaseProviderConfig,
  CreatePaymentRequest,
  PaymentProvider,
  PaymentStatus,
  ProviderStatusResponse,
  WebhookVerificationResult,
} from "../../types";
import type { PayPalConfig, PayPalCreateOrderRequest } from "./types";
import { PaymentError, PaymentErrorCodes } from "../../types";
import {
  PayPalAccessTokenResponseSchema,
  PayPalCaptureResponseSchema,
  PayPalOrderResponseSchema,
  PayPalWebhookEvents,
  PayPalWebhookPayloadSchema,
} from "./types";

/**
 * Base URLs for PayPal API
 */
const PAYPAL_API_URL = "https://api-m.paypal.com";
const PAYPAL_SANDBOX_API_URL = "https://api-m.sandbox.paypal.com";

/**
 * PayPal payment provider implementation
 */
export class PayPalProvider implements PaymentProvider {
  readonly name = "paypal" as const;

  private config: PayPalConfig | null = null;
  private baseUrl: string = PAYPAL_SANDBOX_API_URL;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: BaseProviderConfig): void {
    this.config = {
      clientId: config.apiKey,
      clientSecret: config.apiSecret ?? "",
      webhookId: config.webhookSecret,
      sandboxMode: config.sandboxMode,
    };
    this.baseUrl = config.sandboxMode ? PAYPAL_SANDBOX_API_URL : PAYPAL_API_URL;
  }

  /**
   * Get an access token (with caching)
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new PaymentError(
        "PayPal provider not initialized",
        PaymentErrorCodes.PROVIDER_NOT_CONFIGURED,
        this.name,
      );
    }

    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { error_description?: string };
        throw new PaymentError(
          errorData.error_description ??
            `PayPal OAuth error: ${response.status}`,
          PaymentErrorCodes.PROVIDER_ERROR,
          this.name,
          data,
        );
      }

      const parsed = PayPalAccessTokenResponseSchema.parse(data);
      this.accessToken = parsed.access_token;
      this.tokenExpiresAt = Date.now() + parsed.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `PayPal OAuth request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        PaymentErrorCodes.PROVIDER_ERROR,
        this.name,
        error,
      );
    }
  }

  /**
   * Make an authenticated API request to PayPal
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string> | undefined),
        },
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { message?: string };
        throw new PaymentError(
          errorData.message ?? `PayPal API error: ${response.status}`,
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
        `PayPal API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        PaymentErrorCodes.PROVIDER_ERROR,
        this.name,
        error,
      );
    }
  }

  /**
   * Create a new payment (PayPal Order)
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
    const orderRequest: PayPalCreateOrderRequest = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: request.idempotencyKey,
          description: request.orderDescription,
          custom_id: request.orderId,
          invoice_id: request.orderId,
          amount: {
            currency_code: request.currency,
            value: request.amount.toFixed(2),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            user_action: "PAY_NOW",
            return_url: request.successUrl,
            cancel_url: request.cancelUrl,
          },
        },
      },
    };

    const response = await this.makeRequest<unknown>("/v2/checkout/orders", {
      method: "POST",
      headers: {
        "PayPal-Request-Id": request.idempotencyKey,
        Prefer: "return=representation",
      },
      body: JSON.stringify(orderRequest),
    });

    const parsed = PayPalOrderResponseSchema.parse(response);

    // Find the approval URL
    const approvalLink = parsed.links?.find((link) => link.rel === "approve");

    return {
      externalId: parsed.id,
      status: this.mapStatus(parsed.status),
      invoiceUrl: approvalLink?.href,
      providerData: response as Record<string, unknown>,
    };
  }

  /**
   * Get payment status from PayPal
   */
  async getPaymentStatus(externalId: string): Promise<ProviderStatusResponse> {
    const response = await this.makeRequest<unknown>(
      `/v2/checkout/orders/${externalId}`,
    );

    const parsed = PayPalOrderResponseSchema.parse(response);

    // Extract payment amount if available
    let payAmount: number | undefined;
    let payCurrency: string | undefined;

    if (parsed.purchase_units && parsed.purchase_units.length > 0) {
      const unit = parsed.purchase_units[0];
      if (unit && typeof unit === "object" && "amount" in unit) {
        const amount = unit.amount as {
          value?: string;
          currency_code?: string;
        };
        payAmount = amount.value ? parseFloat(amount.value) : undefined;
        payCurrency = amount.currency_code;
      }
    }

    return {
      externalId: parsed.id,
      status: this.mapStatus(parsed.status),
      payAmount,
      payCurrency,
      rawData: response as Record<string, unknown>,
    };
  }

  /**
   * Capture a payment (after buyer approval)
   */
  async capturePayment(externalId: string): Promise<ProviderStatusResponse> {
    const response = await this.makeRequest<unknown>(
      `/v2/checkout/orders/${externalId}/capture`,
      {
        method: "POST",
        headers: {
          "PayPal-Request-Id": `capture-${externalId}-${Date.now()}`,
        },
      },
    );

    const parsed = PayPalCaptureResponseSchema.parse(response);

    // Extract captured amount
    let capturedAmount: number | undefined;
    let capturedCurrency: string | undefined;

    if (parsed.purchase_units && parsed.purchase_units.length > 0) {
      const unit = parsed.purchase_units[0];
      if (unit?.payments?.captures && unit.payments.captures.length > 0) {
        const capture = unit.payments.captures[0];
        if (capture) {
          capturedAmount = parseFloat(capture.amount.value);
          capturedCurrency = capture.amount.currency_code;
        }
      }
    }

    return {
      externalId: parsed.id,
      status: this.mapCaptureStatus(parsed.status),
      actuallyPaid: capturedAmount,
      payCurrency: capturedCurrency,
      rawData: response as Record<string, unknown>,
    };
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    _secret?: string,
  ): Promise<WebhookVerificationResult> {
    const payloadString =
      typeof payload === "string" ? payload : payload.toString("utf-8");

    // Parse the payload
    let parsedPayload: z.infer<typeof PayPalWebhookPayloadSchema>;
    try {
      const jsonPayload: unknown = JSON.parse(payloadString);
      parsedPayload = PayPalWebhookPayloadSchema.parse(jsonPayload);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid payload format: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }

    // For full verification, we would need to call PayPal's verify webhook signature API
    // This requires the webhook ID and various headers
    const webhookId = this.config?.webhookId;

    if (webhookId) {
      // Get required headers
      const transmissionId = headers["paypal-transmission-id"];
      const transmissionTime = headers["paypal-transmission-time"];
      const certUrl = headers["paypal-cert-url"];
      const authAlgo = headers["paypal-auth-algo"];
      const transmissionSig = headers["paypal-transmission-sig"];

      if (
        transmissionId &&
        transmissionTime &&
        certUrl &&
        authAlgo &&
        transmissionSig
      ) {
        try {
          const verifyResponse = await this.makeRequest<{
            verification_status: string;
          }>("/v1/notifications/verify-webhook-signature", {
            method: "POST",
            body: JSON.stringify({
              auth_algo: Array.isArray(authAlgo) ? authAlgo[0] : authAlgo,
              cert_url: Array.isArray(certUrl) ? certUrl[0] : certUrl,
              transmission_id: Array.isArray(transmissionId)
                ? transmissionId[0]
                : transmissionId,
              transmission_sig: Array.isArray(transmissionSig)
                ? transmissionSig[0]
                : transmissionSig,
              transmission_time: Array.isArray(transmissionTime)
                ? transmissionTime[0]
                : transmissionTime,
              webhook_id: webhookId,
              webhook_event: JSON.parse(payloadString) as Record<
                string,
                unknown
              >,
            }),
          });

          if (verifyResponse.verification_status !== "SUCCESS") {
            return {
              valid: false,
              error: `Webhook verification failed: ${verifyResponse.verification_status}`,
            };
          }
        } catch (error) {
          console.warn("PayPal webhook verification failed:", error);
          // Continue without verification in sandbox mode
          if (!this.config?.sandboxMode) {
            return {
              valid: false,
              error: `Webhook verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
          }
        }
      } else {
        console.warn(
          "Missing PayPal webhook headers - skipping signature verification",
        );
      }
    } else {
      console.warn(
        "PayPal webhook ID not configured - skipping signature verification",
      );
    }

    // Extract order/payment ID from resource
    const resource = parsedPayload.resource;
    let externalId = "";
    let status: PaymentStatus = "pending";

    if ("id" in resource && typeof resource.id === "string") {
      externalId = resource.id;
    }
    if ("status" in resource && typeof resource.status === "string") {
      status = this.mapWebhookStatus(parsedPayload.event_type, resource.status);
    }

    return {
      valid: true,
      event: {
        provider: this.name,
        eventType: parsedPayload.event_type,
        externalId,
        status,
        rawPayload: JSON.parse(payloadString) as Record<string, unknown>,
      },
    };
  }

  /**
   * Map PayPal order status to normalized status
   */
  mapStatus(providerStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      CREATED: "pending",
      SAVED: "pending",
      APPROVED: "confirmed",
      VOIDED: "failed",
      COMPLETED: "finished",
      PAYER_ACTION_REQUIRED: "pending",
    };

    return statusMap[providerStatus] ?? "pending";
  }

  /**
   * Map PayPal capture status to normalized status
   */
  private mapCaptureStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      COMPLETED: "finished",
      DECLINED: "failed",
      PARTIALLY_REFUNDED: "partially_paid",
      PENDING: "confirming",
      REFUNDED: "refunded",
      FAILED: "failed",
    };

    return statusMap[status] ?? "pending";
  }

  /**
   * Map webhook event to normalized status
   */
  private mapWebhookStatus(
    eventType: string,
    resourceStatus: string,
  ): PaymentStatus {
    switch (eventType) {
      case PayPalWebhookEvents.PAYMENT_CAPTURE_COMPLETED:
        return "finished";
      case PayPalWebhookEvents.PAYMENT_CAPTURE_DENIED:
        return "failed";
      case PayPalWebhookEvents.PAYMENT_CAPTURE_PENDING:
        return "confirming";
      case PayPalWebhookEvents.PAYMENT_CAPTURE_REFUNDED:
        return "refunded";
      case PayPalWebhookEvents.CHECKOUT_ORDER_APPROVED:
        return "confirmed";
      case PayPalWebhookEvents.CHECKOUT_ORDER_COMPLETED:
        return "finished";
      case PayPalWebhookEvents.CHECKOUT_PAYMENT_APPROVAL_REVERSED:
        return "failed";
      default:
        return this.mapStatus(resourceStatus);
    }
  }
}

// Default export for convenience
export const payPalProvider = new PayPalProvider();
