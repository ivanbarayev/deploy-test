import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";

import type {
  NewPaymentTransaction,
  PaymentTransaction,
} from "@projectfe/core-db/schema";
import { db as defaultDb } from "@projectfe/core-db/client";
import {
  PaymentTransactionSchema,
  PaymentWebhookLogSchema,
} from "@projectfe/core-db/schema";

import type {
  BaseProviderConfig,
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentStatusRequest,
  GetPaymentStatusResponse,
  PaymentProvider,
  PaymentProviderType,
  PaymentStatus,
  WebhookEvent,
} from "./types";
import { NowPaymentsProvider } from "./providers/nowpayments/provider";
import { PayPalProvider } from "./providers/paypal/provider";
import { PaymentError, PaymentErrorCodes } from "./types";

type DB = typeof defaultDb;

/**
 * Provider registry for managing multiple payment providers
 */
class ProviderRegistry {
  private providers = new Map<PaymentProviderType, PaymentProvider>();
  private configs = new Map<PaymentProviderType, BaseProviderConfig>();

  /**
   * Register a provider with its configuration
   */
  register(
    type: PaymentProviderType,
    provider: PaymentProvider,
    config: BaseProviderConfig,
  ): void {
    provider.initialize(config);
    this.providers.set(type, provider);
    this.configs.set(type, config);
  }

  /**
   * Get a provider by type
   */
  get(type: PaymentProviderType): PaymentProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new PaymentError(
        `Provider '${type}' not registered`,
        PaymentErrorCodes.PROVIDER_NOT_FOUND,
        type,
      );
    }
    return provider;
  }

  /**
   * Get provider config
   */
  getConfig(type: PaymentProviderType): BaseProviderConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Check if a provider is registered
   */
  has(type: PaymentProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * Get all registered provider types
   */
  getRegisteredProviders(): PaymentProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Unregister a provider
   */
  unregister(type: PaymentProviderType): void {
    this.providers.delete(type);
    this.configs.delete(type);
  }
}

/**
 * Payment Service
 * Main entry point for all payment operations
 */
export class PaymentService {
  private registry: ProviderRegistry;
  private db: DB;

  constructor(db: DB = defaultDb) {
    this.registry = new ProviderRegistry();
    this.db = db;
  }

  /**
   * Register the NowPayments provider
   */
  registerNowPayments(config: {
    apiKey: string;
    ipnSecret?: string;
    sandboxMode: boolean; // Remove the optional marker
  }): void {
    this.registry.register("nowpayments", new NowPaymentsProvider(), {
      apiKey: config.apiKey,
      webhookSecret: config.ipnSecret,
      sandboxMode: config.sandboxMode, // No default value
    });
  }

  /**
   * Register the PayPal provider
   */
  registerPayPal(config: {
    clientId: string;
    clientSecret: string;
    webhookId?: string;
    sandboxMode: boolean; // Remove the optional marker
  }): void {
    this.registry.register("paypal", new PayPalProvider(), {
      apiKey: config.clientId,
      apiSecret: config.clientSecret,
      webhookSecret: config.webhookId,
      sandboxMode: config.sandboxMode, // No default value
    });
  }

  /**
   * Register a custom provider
   */
  registerProvider(
    type: PaymentProviderType,
    provider: PaymentProvider,
    config: BaseProviderConfig,
  ): void {
    this.registry.register(type, provider, config);
  }

  /**
   * Get the provider registry
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }

  /**
   * Create a payment with idempotency support
   * Uses database transactions to ensure ACID compliance
   */
  async createPayment(
    provider: PaymentProviderType,
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    const providerInstance = this.registry.get(provider);

    // Use a transaction for idempotency and atomicity
    return await this.db.transaction(async (tx) => {
      // Check for existing payment with same idempotency key
      const existing = await tx.query.PaymentTransactionSchema.findFirst({
        where: eq(
          PaymentTransactionSchema.idempotencyKey,
          request.idempotencyKey,
        ),
      });

      if (existing) {
        // Return existing payment (idempotent)
        return this.transactionToResponse(existing);
      }

      // Create the payment with the provider
      const providerResponse = await providerInstance.createPayment(request);

      // Store in database
      const [transaction] = await tx
        .insert(PaymentTransactionSchema)
        .values({
          idempotencyKey: request.idempotencyKey,
          externalId: providerResponse.externalId,
          provider,
          status: providerResponse.status,
          type: request.type,
          userId: request.userId,
          projectId: request.projectId,
          requestedAmount: request.amount.toString(),
          requestedCurrency: request.currency,
          payAddress: providerResponse.payAddress,
          payCurrency: providerResponse.payCurrency ?? request.payCurrency,
          payAmount: providerResponse.payAmount?.toString(),
          outcomeAddress: request.outcomeAddress,
          outcomeCurrency: request.outcomeCurrency,
          orderId: request.orderId,
          orderDescription: request.orderDescription,
          invoiceUrl: providerResponse.invoiceUrl,
          expiresAt: providerResponse.expiresAt,
          providerMetadata: providerResponse.providerData,
          clientMetadata: request.metadata,
        } satisfies NewPaymentTransaction)
        .returning();

      if (!transaction) {
        throw new PaymentError(
          "Failed to create payment transaction",
          PaymentErrorCodes.DATABASE_ERROR,
          provider,
        );
      }

      return this.transactionToResponse(transaction);
    });
  }

  /**
   * Get payment status
   * First checks database, then optionally refreshes from provider
   */
  async getPaymentStatus(
    request: GetPaymentStatusRequest,
    options?: { refreshFromProvider?: boolean },
  ): Promise<GetPaymentStatusResponse> {
    // Build query conditions
    const conditions = [];
    if (request.transactionId) {
      conditions.push(eq(PaymentTransactionSchema.id, request.transactionId));
    }
    if (request.externalId) {
      conditions.push(
        eq(PaymentTransactionSchema.externalId, request.externalId),
      );
    }
    if (request.idempotencyKey) {
      conditions.push(
        eq(PaymentTransactionSchema.idempotencyKey, request.idempotencyKey),
      );
    }

    if (conditions.length === 0) {
      throw new PaymentError(
        "Must provide transactionId, externalId, or idempotencyKey",
        PaymentErrorCodes.INVALID_REQUEST,
      );
    }

    const transaction = await this.db.query.PaymentTransactionSchema.findFirst({
      where: or(...conditions),
    });

    if (!transaction) {
      throw new PaymentError(
        "Payment not found",
        PaymentErrorCodes.PAYMENT_NOT_FOUND,
      );
    }

    // Optionally refresh status from provider
    if (options?.refreshFromProvider && transaction.externalId) {
      return this.refreshPaymentStatus(transaction);
    }

    return this.transactionToStatusResponse(transaction);
  }

  /**
   * Refresh payment status from provider
   */
  async refreshPaymentStatus(
    transaction: PaymentTransaction,
  ): Promise<GetPaymentStatusResponse> {
    if (!transaction.externalId) {
      return this.transactionToStatusResponse(transaction);
    }

    const provider = this.registry.get(transaction.provider);
    const providerStatus = await provider.getPaymentStatus(
      transaction.externalId,
    );

    // Update in database
    const [updated] = await this.db
      .update(PaymentTransactionSchema)
      .set({
        status: providerStatus.status,
        receivedAmount: providerStatus.actuallyPaid?.toString(),
        receivedCurrency: providerStatus.payCurrency,
        payAmount: providerStatus.payAmount?.toString(),
        lastStatusCheckAt: new Date(),
        providerMetadata: providerStatus.rawData,
        updatedAt: new Date(),
        ...(providerStatus.status === "finished" && !transaction.completedAt
          ? { completedAt: new Date() }
          : {}),
        ...(providerStatus.status === "confirmed" && !transaction.confirmedAt
          ? { confirmedAt: new Date() }
          : {}),
      })
      .where(eq(PaymentTransactionSchema.id, transaction.id))
      .returning();

    return this.transactionToStatusResponse(updated ?? transaction);
  }

  /**
   * Process a webhook event
   * Handles idempotency by logging all events
   */
  async processWebhook(
    provider: PaymentProviderType,
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
    sourceIp?: string,
  ): Promise<{
    processed: boolean;
    transaction?: PaymentTransaction;
    event?: WebhookEvent;
    error?: string;
  }> {
    const providerInstance = this.registry.get(provider);
    const config = this.registry.getConfig(provider);

    // Verify the webhook
    const verification = await providerInstance.verifyWebhook(
      payload,
      headers,
      config?.webhookSecret,
    );

    // Log the webhook regardless of verification status
    const [webhookLog] = await this.db
      .insert(PaymentWebhookLogSchema)
      .values({
        provider,
        externalId: verification.event?.externalId,
        eventType: verification.event?.eventType,
        rawPayload:
          typeof payload === "string"
            ? JSON.parse(payload)
            : JSON.parse(payload.toString()),
        rawHeaders: headers as Record<string, unknown>,
        signatureValid: verification.valid,
        sourceIp,
        error: verification.error,
      })
      .returning();

    if (!verification.valid || !verification.event) {
      return {
        processed: false,
        error: verification.error ?? "Webhook verification failed",
      };
    }

    const event = verification.event;

    // Find the transaction
    const transaction = await this.db.query.PaymentTransactionSchema.findFirst({
      where: eq(PaymentTransactionSchema.externalId, event.externalId),
    });

    if (!transaction) {
      // Update webhook log with error
      if (webhookLog) {
        await this.db
          .update(PaymentWebhookLogSchema)
          .set({
            error: "Transaction not found",
            processedAt: new Date(),
          })
          .where(eq(PaymentWebhookLogSchema.id, webhookLog.id));
      }

      return {
        processed: false,
        event,
        error: `Transaction not found for external ID: ${event.externalId}`,
      };
    }

    // Update transaction status using transaction for atomicity
    const [updated] = await this.db.transaction(async (tx) => {
      // Re-fetch to ensure we have latest state
      const current = await tx.query.PaymentTransactionSchema.findFirst({
        where: eq(PaymentTransactionSchema.id, transaction.id),
      });

      if (!current) {
        throw new PaymentError(
          "Transaction disappeared",
          PaymentErrorCodes.DATABASE_ERROR,
          provider,
        );
      }

      // Update the transaction
      const updateData: Partial<NewPaymentTransaction> = {
        status: event.status,
        lastWebhookAt: new Date(),
        webhookCount: (current.webhookCount || 0) + 1,
        updatedAt: new Date(),
      };

      if (event.actuallyPaid !== undefined) {
        updateData.receivedAmount = event.actuallyPaid.toString();
      }
      if (event.payCurrency) {
        updateData.receivedCurrency = event.payCurrency;
      }
      if (event.payAmount !== undefined) {
        updateData.payAmount = event.payAmount.toString();
      }

      // Set completion timestamps based on status
      if (event.status === "confirmed" && !current.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
      if (
        (event.status === "finished" || event.status === "refunded") &&
        !current.completedAt
      ) {
        updateData.completedAt = new Date();
      }

      const [result] = await tx
        .update(PaymentTransactionSchema)
        .set(updateData)
        .where(eq(PaymentTransactionSchema.id, transaction.id))
        .returning();

      // Update webhook log
      if (webhookLog) {
        await tx
          .update(PaymentWebhookLogSchema)
          .set({
            transactionId: transaction.id,
            processed: true,
            processedAt: new Date(),
          })
          .where(eq(PaymentWebhookLogSchema.id, webhookLog.id));
      }

      return [result];
    });

    return {
      processed: true,
      transaction: updated ?? transaction,
      event,
    };
  }

  /**
   * Check and update status of pending payments
   * Should be called periodically by a cron job
   */
  async checkPendingPayments(options?: {
    provider?: PaymentProviderType;
    olderThanMinutes?: number;
    limit?: number;
  }): Promise<{
    checked: number;
    updated: number;
    errors: { id: number; error: string }[];
  }> {
    const olderThan = new Date(
      Date.now() - (options?.olderThanMinutes ?? 5) * 60 * 1000,
    );

    // Find pending payments that need checking
    const conditions = [
      inArray(PaymentTransactionSchema.status, [
        "pending",
        "confirming",
        "confirmed",
        "sending",
        "partially_paid",
      ]),
      or(
        isNull(PaymentTransactionSchema.lastStatusCheckAt),
        lt(PaymentTransactionSchema.lastStatusCheckAt, olderThan),
      ),
    ];

    if (options?.provider) {
      conditions.push(eq(PaymentTransactionSchema.provider, options.provider));
    }

    const pendingPayments =
      await this.db.query.PaymentTransactionSchema.findMany({
        where: and(...conditions),
        limit: options?.limit ?? 100,
        orderBy: (t, { asc }) => [asc(t.lastStatusCheckAt)],
      });

    const results = {
      checked: pendingPayments.length,
      updated: 0,
      errors: [] as { id: number; error: string }[],
    };

    for (const payment of pendingPayments) {
      try {
        const beforeStatus = payment.status;
        await this.refreshPaymentStatus(payment);

        // Check if status changed
        const after = await this.db.query.PaymentTransactionSchema.findFirst({
          where: eq(PaymentTransactionSchema.id, payment.id),
        });

        if (after && after.status !== beforeStatus) {
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          id: payment.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get payments for a user
   */
  async getUserPayments(
    userId: number,
    options?: {
      provider?: PaymentProviderType;
      status?: PaymentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<PaymentTransaction[]> {
    const conditions = [eq(PaymentTransactionSchema.userId, userId)];

    if (options?.provider) {
      conditions.push(eq(PaymentTransactionSchema.provider, options.provider));
    }
    if (options?.status) {
      conditions.push(eq(PaymentTransactionSchema.status, options.status));
    }

    return this.db.query.PaymentTransactionSchema.findMany({
      where: and(...conditions),
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /**
   * Get all payments with filtering
   */
  async getPayments(options?: {
    provider?: PaymentProviderType;
    status?: PaymentStatus;
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentTransaction[]> {
    const conditions = [];

    if (options?.provider) {
      conditions.push(eq(PaymentTransactionSchema.provider, options.provider));
    }
    if (options?.status) {
      conditions.push(eq(PaymentTransactionSchema.status, options.status));
    }
    if (options?.projectId) {
      conditions.push(
        eq(PaymentTransactionSchema.projectId, options.projectId),
      );
    }

    return this.db.query.PaymentTransactionSchema.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /**
   * Get webhook logs for debugging
   */
  async getWebhookLogs(options?: {
    provider?: PaymentProviderType;
    transactionId?: number;
    limit?: number;
  }): Promise<(typeof PaymentWebhookLogSchema.$inferSelect)[]> {
    const conditions = [];

    if (options?.provider) {
      conditions.push(eq(PaymentWebhookLogSchema.provider, options.provider));
    }
    if (options?.transactionId) {
      conditions.push(
        eq(PaymentWebhookLogSchema.transactionId, options.transactionId),
      );
    }

    return this.db.query.PaymentWebhookLogSchema.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: options?.limit ?? 50,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /**
   * Convert transaction to create response
   */
  private transactionToResponse(
    transaction: PaymentTransaction,
  ): CreatePaymentResponse {
    return {
      transactionId: transaction.id,
      externalId: transaction.externalId ?? "",
      status: transaction.status,
      payAddress: transaction.payAddress ?? undefined,
      payCurrency: transaction.payCurrency ?? undefined,
      payAmount: transaction.payAmount
        ? parseFloat(transaction.payAmount)
        : undefined,
      invoiceUrl: transaction.invoiceUrl ?? undefined,
      expiresAt: transaction.expiresAt ?? undefined,
      providerData: transaction.providerMetadata as
        | Record<string, unknown>
        | undefined,
    };
  }

  /**
   * Convert transaction to status response
   */
  private transactionToStatusResponse(
    transaction: PaymentTransaction,
  ): GetPaymentStatusResponse {
    return {
      transactionId: transaction.id,
      externalId: transaction.externalId ?? undefined,
      status: transaction.status,
      requestedAmount: parseFloat(transaction.requestedAmount),
      requestedCurrency: transaction.requestedCurrency,
      receivedAmount: transaction.receivedAmount
        ? parseFloat(transaction.receivedAmount)
        : undefined,
      receivedCurrency: transaction.receivedCurrency ?? undefined,
      payAddress: transaction.payAddress ?? undefined,
      payCurrency: transaction.payCurrency ?? undefined,
      payAmount: transaction.payAmount
        ? parseFloat(transaction.payAmount)
        : undefined,
      invoiceUrl: transaction.invoiceUrl ?? undefined,
      confirmedAt: transaction.confirmedAt ?? undefined,
      completedAt: transaction.completedAt ?? undefined,
      expiresAt: transaction.expiresAt ?? undefined,
      providerData: transaction.providerMetadata as
        | Record<string, unknown>
        | undefined,
    };
  }
}

// Singleton instance for convenience
let paymentServiceInstance: PaymentService | null = null;

/**
 * Get or create the payment service instance
 */
export function getPaymentService(db?: DB): PaymentService {
  paymentServiceInstance ??= new PaymentService(db);
  return paymentServiceInstance;
}

/**
 * Create a new payment service instance
 */
export function createPaymentService(db?: DB): PaymentService {
  return new PaymentService(db);
}
