import { z } from "zod/v4";

/**
 * Supported payment providers
 */
export const PaymentProviderType = z.enum(["nowpayments", "paypal"]);
export type PaymentProviderType = z.infer<typeof PaymentProviderType>;

/**
 * Payment status (normalized across providers)
 */
export const PaymentStatus = z.enum([
  "pending",
  "confirming",
  "confirmed",
  "sending",
  "partially_paid",
  "finished",
  "failed",
  "refunded",
  "expired",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

/**
 * Payment type
 */
export const PaymentType = z.enum(["deposit", "subscription", "one_time"]);
export type PaymentType = z.infer<typeof PaymentType>;

/**
 * Base configuration for all payment providers
 */
export const BaseProviderConfigSchema = z.object({
  apiKey: z.string(),
  apiSecret: z.string().optional(),
  webhookSecret: z.string().optional(),
  sandboxMode: z.boolean().default(false),
});
export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>;

/**
 * Request to create a payment
 */
export const CreatePaymentRequestSchema = z.object({
  // Idempotency key to prevent duplicates
  idempotencyKey: z.string().min(1).max(255),

  // Amount and currency
  amount: z.number().positive(),
  currency: z.string().min(3).max(10),

  // For crypto payments - the crypto currency to pay with
  payCurrency: z.string().optional(),

  // Order reference
  orderId: z.string().optional(),
  orderDescription: z.string().optional(),

  // Payout address (for crypto payments acting as gateway)
  outcomeAddress: z.string().optional(),
  outcomeCurrency: z.string().optional(),

  // User info
  userId: z.number().optional(),

  // Project/tenant ID
  projectId: z.string().optional(),

  // Payment type
  type: PaymentType.default("one_time"),

  // URLs for redirects
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),

  // Webhook URL override
  ipnCallbackUrl: z.string().url().optional(),

  // Custom metadata
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

/**
 * Response from creating a payment
 */
export const CreatePaymentResponseSchema = z.object({
  // Internal transaction ID
  transactionId: z.number(),

  // External provider payment ID
  externalId: z.string(),

  // Payment status
  status: PaymentStatus,

  // Payment address (for crypto)
  payAddress: z.string().optional(),
  payCurrency: z.string().optional(),
  payAmount: z.number().optional(),

  // Invoice URL for hosted checkout
  invoiceUrl: z.string().optional(),

  // Expiration time
  expiresAt: z.date().optional(),

  // Provider-specific data
  providerData: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>;

/**
 * Request to get payment status
 */
export const GetPaymentStatusRequestSchema = z.object({
  // Either internal transaction ID or external provider ID
  transactionId: z.number().optional(),
  externalId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type GetPaymentStatusRequest = z.infer<
  typeof GetPaymentStatusRequestSchema
>;

/**
 * Response from getting payment status
 */
export const GetPaymentStatusResponseSchema = z.object({
  transactionId: z.number(),
  externalId: z.string().optional(),
  status: PaymentStatus,

  requestedAmount: z.number(),
  requestedCurrency: z.string(),

  receivedAmount: z.number().optional(),
  receivedCurrency: z.string().optional(),

  payAddress: z.string().optional(),
  payCurrency: z.string().optional(),
  payAmount: z.number().optional(),

  invoiceUrl: z.string().optional(),

  confirmedAt: z.date().optional(),
  completedAt: z.date().optional(),
  expiresAt: z.date().optional(),

  providerData: z.record(z.string(), z.unknown()).optional(),
});
export type GetPaymentStatusResponse = z.infer<
  typeof GetPaymentStatusResponseSchema
>;

/**
 * Webhook event data (normalized)
 */
export const WebhookEventSchema = z.object({
  provider: PaymentProviderType,
  eventType: z.string(),
  externalId: z.string(),
  status: PaymentStatus,

  actuallyPaid: z.number().optional(),
  payAmount: z.number().optional(),
  payCurrency: z.string().optional(),

  outcomeAmount: z.number().optional(),
  outcomeCurrency: z.string().optional(),

  rawPayload: z.record(z.string(), z.unknown()),
});
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Result of webhook verification
 */
export interface WebhookVerificationResult {
  valid: boolean;
  event?: WebhookEvent;
  error?: string;
}

/**
 * Provider-specific API response for status check
 */
export interface ProviderStatusResponse {
  externalId: string;
  status: PaymentStatus;
  actuallyPaid?: number;
  payAmount?: number;
  payCurrency?: string;
  outcomeAmount?: number;
  outcomeCurrency?: string;
  rawData: Record<string, unknown>;
}

/**
 * Interface that all payment providers must implement
 */
export interface PaymentProvider {
  readonly name: PaymentProviderType;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: BaseProviderConfig): void;

  /**
   * Create a new payment
   */
  createPayment(request: CreatePaymentRequest): Promise<{
    externalId: string;
    status: PaymentStatus;
    payAddress?: string;
    payCurrency?: string;
    payAmount?: number;
    invoiceUrl?: string;
    expiresAt?: Date;
    providerData?: Record<string, unknown>;
  }>;

  /**
   * Get payment status from the provider
   */
  getPaymentStatus(externalId: string): Promise<ProviderStatusResponse>;

  /**
   * Verify webhook signature and parse the event
   */
  verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret?: string,
  ): Promise<WebhookVerificationResult>;

  /**
   * Map provider-specific status to normalized status
   */
  mapStatus(providerStatus: string): PaymentStatus;
}

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
  provider: PaymentProvider;
  config: BaseProviderConfig;
}

/**
 * Error thrown by payment operations
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: PaymentProviderType,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * Common error codes
 */
export const PaymentErrorCodes = {
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  INVALID_REQUEST: "INVALID_REQUEST",
  DUPLICATE_PAYMENT: "DUPLICATE_PAYMENT",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  WEBHOOK_VERIFICATION_FAILED: "WEBHOOK_VERIFICATION_FAILED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;
