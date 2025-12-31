import { z } from "zod/v4";

/**
 * NowPayments API Configuration
 */
export const NowPaymentsConfigSchema = z.object({
  apiKey: z.string(),
  ipnSecret: z.string().optional(),
  sandboxMode: z.boolean().default(false),
});
export type NowPaymentsConfig = z.infer<typeof NowPaymentsConfigSchema>;

/**
 * NowPayments Create Payment Request
 * Based on: https://documenter.getpostman.com/view/7907941/2s93JusNJt#6f3d3cd9-f195-4d12-93ae-a99db98b7d10
 */
export const NowPaymentsCreatePaymentSchema = z.object({
  price_amount: z.number().positive(),
  price_currency: z.string(),
  pay_currency: z.string().optional(),
  ipn_callback_url: z.string().url().optional(),
  order_id: z.string().optional(),
  order_description: z.string().optional(),
  purchase_id: z.string().optional(),
  payout_address: z.string().optional(),
  payout_currency: z.string().optional(),
  payout_extra_id: z.string().optional(),
  fixed_rate: z.boolean().optional(),
  is_fee_paid_by_user: z.boolean().optional(),
  case: z.enum(["success", "fail"]).optional(), // For sandbox testing
});
export type NowPaymentsCreatePayment = z.infer<
  typeof NowPaymentsCreatePaymentSchema
>;

/**
 * NowPayments Create Payment Response
 */
export const NowPaymentsPaymentResponseSchema = z.object({
  payment_id: z.union([z.string(), z.number()]).transform(String),
  payment_status: z.string(),
  pay_address: z.string().optional(),
  price_amount: z.number(),
  price_currency: z.string(),
  pay_amount: z.number().nullable().optional(),
  pay_currency: z.string().optional(),
  order_id: z.string().nullable().optional(),
  order_description: z.string().nullable().optional(),
  purchase_id: z.union([z.string(), z.number()]).transform(String).optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
  expiration_estimate_date: z.string().optional(),
  payout_hash: z.string().nullable().optional(),
  payin_hash: z.string().nullable().optional(),
  payin_extra_id: z.string().nullable().optional(),
  smart_contract: z.string().nullable().optional(),
  network: z.string().optional(),
  network_precision: z.number().nullable().optional(),
  time_limit: z.number().nullable().optional(),
  burning_percent: z.union([z.string(), z.number()]).nullable().optional(),
  actually_paid: z.number().nullable().optional(),
  actually_paid_at_fiat: z.number().nullable().optional(),
  outcome_amount: z.number().nullable().optional(),
  outcome_currency: z.string().nullable().optional(),
  invoice_id: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
  type: z.string().optional(),
});
export type NowPaymentsPaymentResponse = z.infer<
  typeof NowPaymentsPaymentResponseSchema
>;

/**
 * NowPayments Payment Status Response
 */
export const NowPaymentsStatusResponseSchema = NowPaymentsPaymentResponseSchema;
export type NowPaymentsStatusResponse = z.infer<
  typeof NowPaymentsStatusResponseSchema
>;

/**
 * NowPayments Fee Information
 */
export const NowPaymentsFeeSchema = z.object({
  currency: z.string(),
  depositFee: z.number().optional(),
  withdrawalFee: z.number().optional(),
  serviceFee: z.number().optional(),
});
export type NowPaymentsFee = z.infer<typeof NowPaymentsFeeSchema>;

/**
 * NowPayments IPN (Webhook) Payload
 * Based on: https://documenter.getpostman.com/view/7907941/2s93JusNJt#f185492a-46a7-4649-84b5-5f88cdf3e5a3
 */
export const NowPaymentsIPNPayloadSchema = z.object({
  payment_id: z.union([z.string(), z.number()]).transform(String),
  parent_payment_id: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => (val === null ? null : String(val)))
    .optional(),
  invoice_id: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
  payment_status: z.string(),
  pay_address: z.string().optional(),
  payin_extra_id: z.string().nullable().optional(),
  price_amount: z.number(),
  price_currency: z.string(),
  pay_amount: z.number().nullable().optional(),
  actually_paid: z.number().nullable().optional(),
  actually_paid_at_fiat: z.number().nullable().optional(),
  pay_currency: z.string().optional(),
  order_id: z.string().nullable().optional(),
  order_description: z.string().nullable().optional(),
  purchase_id: z.union([z.string(), z.number()]).transform(String).optional(),
  outcome_amount: z.number().nullable().optional(),
  outcome_currency: z.string().optional(),
  payment_extra_ids: z.union([z.string(), z.null()]).optional(),
  fee: NowPaymentsFeeSchema.optional(),
  payin_hash: z.string().nullable().optional(),
  payout_hash: z.string().nullable().optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
  burning_percent: z.union([z.string(), z.number()]).nullable().optional(),
  type: z.string().optional(),
});
export type NowPaymentsIPNPayload = z.infer<typeof NowPaymentsIPNPayloadSchema>;

/**
 * NowPayments API Error Response
 */
export const NowPaymentsErrorResponseSchema = z.object({
  statusCode: z.number().optional(),
  code: z.string().optional(),
  message: z.string(),
});
export type NowPaymentsErrorResponse = z.infer<
  typeof NowPaymentsErrorResponseSchema
>;

/**
 * NowPayments Status API Response
 */
export const NowPaymentsAPIStatusSchema = z.object({
  message: z.string(),
});
export type NowPaymentsAPIStatus = z.infer<typeof NowPaymentsAPIStatusSchema>;

/**
 * NowPayments Available Currencies Response
 */
export const NowPaymentsCurrenciesResponseSchema = z.object({
  currencies: z.array(z.string()),
});
export type NowPaymentsCurrenciesResponse = z.infer<
  typeof NowPaymentsCurrenciesResponseSchema
>;

/**
 * NowPayments minimum payment amount response
 */
export const NowPaymentsMinAmountResponseSchema = z.object({
  currency_from: z.string(),
  currency_to: z.string().optional(),
  min_amount: z.number(),
  fiat_equivalent: z.number().optional(),
});
export type NowPaymentsMinAmountResponse = z.infer<
  typeof NowPaymentsMinAmountResponseSchema
>;

/**
 * NowPayments estimated price response
 */
export const NowPaymentsEstimateResponseSchema = z.object({
  currency_from: z.string(),
  amount_from: z.number(),
  currency_to: z.string(),
  estimated_amount: z.number(),
});
export type NowPaymentsEstimateResponse = z.infer<
  typeof NowPaymentsEstimateResponseSchema
>;

/**
 * Invoice creation request
 */
export const NowPaymentsCreateInvoiceSchema = z.object({
  price_amount: z.number().positive(),
  price_currency: z.string(),
  pay_currency: z.string().optional(),
  ipn_callback_url: z.string().url().optional(),
  order_id: z.string().optional(),
  order_description: z.string().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  partially_paid_url: z.string().url().optional(),
  is_fixed_rate: z.boolean().optional(),
  is_fee_paid_by_user: z.boolean().optional(),
});
export type NowPaymentsCreateInvoice = z.infer<
  typeof NowPaymentsCreateInvoiceSchema
>;

/**
 * Invoice response
 */
export const NowPaymentsInvoiceResponseSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  token_id: z.string().optional(),
  order_id: z.string().optional(),
  order_description: z.string().optional(),
  price_amount: z.union([z.string(), z.number()]).transform(Number),
  price_currency: z.string(),
  pay_currency: z.string().optional(),
  ipn_callback_url: z.string().optional(),
  invoice_url: z.string(),
  success_url: z.string().optional(),
  cancel_url: z.string().optional(),
  partially_paid_url: z.string().optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
  is_fixed_rate: z.boolean().optional(),
  is_fee_paid_by_user: z.boolean().optional(),
});
export type NowPaymentsInvoiceResponse = z.infer<
  typeof NowPaymentsInvoiceResponseSchema
>;

/**
 * NowPayments payment statuses
 */
export const NowPaymentsStatuses = {
  WAITING: "waiting",
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
  SENDING: "sending",
  PARTIALLY_PAID: "partially_paid",
  FINISHED: "finished",
  FAILED: "failed",
  REFUNDED: "refunded",
  EXPIRED: "expired",
} as const;

export type NowPaymentsStatus =
  (typeof NowPaymentsStatuses)[keyof typeof NowPaymentsStatuses];
