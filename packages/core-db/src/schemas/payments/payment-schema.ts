import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { DB_SCHEMA_NAME } from "../_constants";
import { DB_SCHEMA_SUBNAME } from "./_constants";

// Enum for payment providers
export const paymentProviderEnum = pgEnum(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "payment_provider",
  ["nowpayments", "paypal"],
);

// Enum for payment status
export const paymentStatusEnum = pgEnum(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "payment_status",
  [
    "pending",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid",
    "finished",
    "failed",
    "refunded",
    "expired",
  ],
);

// Enum for payment type
export const paymentTypeEnum = pgEnum(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "payment_type",
  ["deposit", "subscription", "one_time"],
);

/**
 * Payment Transactions Table
 * Stores all payment transaction records with full audit trail
 */
export const PaymentTransactionSchema = pgTable(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "transactions",
  {
    id: serial("id").primaryKey().notNull(),

    // Idempotency key to prevent duplicate transactions
    idempotencyKey: text("idempotency_key").notNull(),

    // External reference from the payment provider
    externalId: text("external_id"),

    // Payment provider used
    provider: paymentProviderEnum().notNull(),

    // Payment status
    status: paymentStatusEnum().notNull().default("pending"),

    // Payment type
    type: paymentTypeEnum().notNull().default("one_time"),

    // User reference (nullable for anonymous payments)
    userId: integer("user_id"),

    // Project/tenant identifier for multi-project support
    projectId: text("project_id"),

    // Amount details
    requestedAmount: decimal("requested_amount", {
      precision: 18,
      scale: 8,
    }).notNull(),
    requestedCurrency: text("requested_currency").notNull(),

    // Actual received amount (may differ in crypto)
    receivedAmount: decimal("received_amount", { precision: 18, scale: 8 }),
    receivedCurrency: text("received_currency"),

    // Pay address (for crypto payments)
    payAddress: text("pay_address"),
    payCurrency: text("pay_currency"),
    payAmount: decimal("pay_amount", { precision: 18, scale: 8 }),

    // Outcome address for payouts
    outcomeAddress: text("outcome_address"),
    outcomeCurrency: text("outcome_currency"),

    // Order/invoice reference
    orderId: text("order_id"),
    orderDescription: text("order_description"),

    // Invoice URL for payment provider
    invoiceUrl: text("invoice_url"),

    // Webhook/IPN tracking
    lastWebhookAt: timestamp("last_webhook_at", { withTimezone: true }),
    webhookCount: integer("webhook_count").default(0).notNull(),

    // Last status check via API (cron verification)
    lastStatusCheckAt: timestamp("last_status_check_at", {
      withTimezone: true,
    }),

    // Provider-specific metadata
    providerMetadata: jsonb("provider_metadata"),

    // Custom metadata from the client
    clientMetadata: jsonb("client_metadata"),

    // Error tracking
    lastError: text("last_error"),

    // Timestamps
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_idempotency_key_idx").on(table.idempotencyKey),
    index("payment_external_id_idx").on(table.externalId),
    index("payment_user_id_idx").on(table.userId),
    index("payment_status_idx").on(table.status),
    index("payment_provider_idx").on(table.provider),
    index("payment_project_id_idx").on(table.projectId),
    index("payment_order_id_idx").on(table.orderId),
    index("payment_created_at_idx").on(table.createdAt),
  ],
).enableRLS();

/**
 * Payment Webhook Logs Table
 * Stores all webhook events for audit and debugging
 */
export const PaymentWebhookLogSchema = pgTable(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "webhook_logs",
  {
    id: serial("id").primaryKey().notNull(),

    // Reference to the transaction
    transactionId: integer("transaction_id"),

    // Provider that sent the webhook
    provider: paymentProviderEnum().notNull(),

    // External payment ID from provider
    externalId: text("external_id"),

    // Event type from provider
    eventType: text("event_type"),

    // Raw payload received
    rawPayload: jsonb("raw_payload").notNull(),

    // Raw headers received
    rawHeaders: jsonb("raw_headers"),

    // Processing status
    processed: boolean("processed").default(false).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),

    // Error if processing failed
    error: text("error"),

    // IP address of webhook source
    sourceIp: text("source_ip"),

    // Signature verification status
    signatureValid: boolean("signature_valid"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("webhook_log_transaction_id_idx").on(table.transactionId),
    index("webhook_log_external_id_idx").on(table.externalId),
    index("webhook_log_provider_idx").on(table.provider),
    index("webhook_log_created_at_idx").on(table.createdAt),
  ],
).enableRLS();

/**
 * Payment Provider Configuration Table
 * Stores provider-specific configuration per project
 */
export const PaymentProviderConfigSchema = pgTable(
  DB_SCHEMA_NAME + DB_SCHEMA_SUBNAME + "provider_configs",
  {
    id: serial("id").primaryKey().notNull(),

    // Project identifier
    projectId: text("project_id").notNull(),

    // Provider name
    provider: paymentProviderEnum().notNull(),

    // Whether this provider is enabled
    enabled: boolean("enabled").default(true).notNull(),

    // Encrypted API credentials (should be encrypted at rest)
    apiKey: text("api_key"),
    apiSecret: text("api_secret"),

    // Webhook secret for signature verification
    webhookSecret: text("webhook_secret"),

    // Provider-specific configuration
    config: jsonb("config"),

    // Sandbox/test mode
    sandboxMode: boolean("sandbox_mode").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("provider_config_project_provider_idx").on(
      table.projectId,
      table.provider,
    ),
  ],
).enableRLS();

// Zod schemas for validation
export const CreatePaymentTransactionSchema = z.object({
  idempotencyKey: z.string(),
  externalId: z.string().optional(),
  provider: z.enum(["nowpayments", "paypal"]),
  status: z.enum([
    "pending",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid",
    "finished",
    "failed",
    "refunded",
    "expired",
  ]).default("pending"),
  type: z.enum(["deposit", "subscription", "one_time"]).default("one_time"),
  userId: z.number().int().optional(),
  projectId: z.string().optional(),
  requestedAmount: z.string(),
  requestedCurrency: z.string(),
  receivedAmount: z.string().optional(),
  receivedCurrency: z.string().optional(),
  payAddress: z.string().optional(),
  payCurrency: z.string().optional(),
  payAmount: z.string().optional(),
  outcomeAddress: z.string().optional(),
  outcomeCurrency: z.string().optional(),
  orderId: z.string().optional(),
  orderDescription: z.string().optional(),
  invoiceUrl: z.string().optional(),
  lastWebhookAt: z.date().optional(),
  webhookCount: z.number().int().default(0),
  lastStatusCheckAt: z.date().optional(),
  providerMetadata: z.any().optional(),
  clientMetadata: z.any().optional(),
  lastError: z.string().optional(),
  expiresAt: z.date().optional(),
  confirmedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export const SelectPaymentTransactionSchema = z.object({
  id: z.number().int(),
  idempotencyKey: z.string(),
  externalId: z.string().nullable(),
  provider: z.enum(["nowpayments", "paypal"]),
  status: z.enum([
    "pending",
    "confirming",
    "confirmed",
    "sending",
    "partially_paid",
    "finished",
    "failed",
    "refunded",
    "expired",
  ]),
  type: z.enum(["deposit", "subscription", "one_time"]),
  userId: z.number().int().nullable(),
  projectId: z.string().nullable(),
  requestedAmount: z.string(),
  requestedCurrency: z.string(),
  receivedAmount: z.string().nullable(),
  receivedCurrency: z.string().nullable(),
  payAddress: z.string().nullable(),
  payCurrency: z.string().nullable(),
  payAmount: z.string().nullable(),
  outcomeAddress: z.string().nullable(),
  outcomeCurrency: z.string().nullable(),
  orderId: z.string().nullable(),
  orderDescription: z.string().nullable(),
  invoiceUrl: z.string().nullable(),
  lastWebhookAt: z.date().nullable(),
  webhookCount: z.number().int(),
  lastStatusCheckAt: z.date().nullable(),
  providerMetadata: z.any().nullable(),
  clientMetadata: z.any().nullable(),
  lastError: z.string().nullable(),
  expiresAt: z.date().nullable(),
  confirmedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePaymentWebhookLogSchema = z.object({
  transactionId: z.number().int().optional(),
  provider: z.enum(["nowpayments", "paypal"]),
  externalId: z.string().optional(),
  eventType: z.string().optional(),
  rawPayload: z.any(),
  rawHeaders: z.any().optional(),
  processed: z.boolean().default(false),
  processedAt: z.date().optional(),
  error: z.string().optional(),
  sourceIp: z.string().optional(),
  signatureValid: z.boolean().optional(),
});

export const CreatePaymentProviderConfigSchema = z.object({
  projectId: z.string(),
  provider: z.enum(["nowpayments", "paypal"]),
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookSecret: z.string().optional(),
  config: z.any().optional(),
  sandboxMode: z.boolean().default(true),
});

// Type exports
export type PaymentTransaction = typeof PaymentTransactionSchema.$inferSelect;
export type NewPaymentTransaction =
  typeof PaymentTransactionSchema.$inferInsert;
export type PaymentWebhookLog = typeof PaymentWebhookLogSchema.$inferSelect;
export type NewPaymentWebhookLog = typeof PaymentWebhookLogSchema.$inferInsert;
export type PaymentProviderConfig =
  typeof PaymentProviderConfigSchema.$inferSelect;
export type NewPaymentProviderConfig =
  typeof PaymentProviderConfigSchema.$inferInsert;

export type PaymentProvider = "nowpayments" | "paypal";
export type PaymentStatus =
  | "pending"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";
export type PaymentType = "deposit" | "subscription" | "one_time";
