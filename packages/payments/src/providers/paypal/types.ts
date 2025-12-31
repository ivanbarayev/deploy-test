import { z } from "zod/v4";

/**
 * PayPal API Configuration
 */
export const PayPalConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  webhookId: z.string().optional(),
  sandboxMode: z.boolean().default(false),
});
export type PayPalConfig = z.infer<typeof PayPalConfigSchema>;

/**
 * PayPal Order Intent
 */
export const PayPalOrderIntent = z.enum(["CAPTURE", "AUTHORIZE"]);
export type PayPalOrderIntent = z.infer<typeof PayPalOrderIntent>;

/**
 * PayPal Money Amount
 */
export const PayPalMoneySchema = z.object({
  currency_code: z.string(),
  value: z.string(),
});
export type PayPalMoney = z.infer<typeof PayPalMoneySchema>;

/**
 * PayPal Purchase Unit
 */
export const PayPalPurchaseUnitSchema = z.object({
  reference_id: z.string().optional(),
  description: z.string().optional(),
  custom_id: z.string().optional(),
  invoice_id: z.string().optional(),
  soft_descriptor: z.string().optional(),
  amount: z.object({
    currency_code: z.string(),
    value: z.string(),
    breakdown: z
      .object({
        item_total: PayPalMoneySchema.optional(),
        shipping: PayPalMoneySchema.optional(),
        handling: PayPalMoneySchema.optional(),
        tax_total: PayPalMoneySchema.optional(),
        insurance: PayPalMoneySchema.optional(),
        shipping_discount: PayPalMoneySchema.optional(),
        discount: PayPalMoneySchema.optional(),
      })
      .optional(),
  }),
  payee: z
    .object({
      email_address: z.string().optional(),
      merchant_id: z.string().optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        unit_amount: PayPalMoneySchema,
        quantity: z.string(),
        description: z.string().optional(),
        sku: z.string().optional(),
        category: z
          .enum(["DIGITAL_GOODS", "PHYSICAL_GOODS", "DONATION"])
          .optional(),
      }),
    )
    .optional(),
});
export type PayPalPurchaseUnit = z.infer<typeof PayPalPurchaseUnitSchema>;

/**
 * PayPal Create Order Request
 */
export const PayPalCreateOrderRequestSchema = z.object({
  intent: PayPalOrderIntent,
  purchase_units: z.array(PayPalPurchaseUnitSchema),
  payment_source: z
    .object({
      paypal: z
        .object({
          experience_context: z
            .object({
              payment_method_preference: z
                .enum(["IMMEDIATE_PAYMENT_REQUIRED", "UNRESTRICTED"])
                .optional(),
              brand_name: z.string().optional(),
              locale: z.string().optional(),
              landing_page: z
                .enum(["LOGIN", "BILLING", "NO_PREFERENCE"])
                .optional(),
              shipping_preference: z
                .enum(["GET_FROM_FILE", "NO_SHIPPING", "SET_PROVIDED_ADDRESS"])
                .optional(),
              user_action: z.enum(["CONTINUE", "PAY_NOW"]).optional(),
              return_url: z.string().url().optional(),
              cancel_url: z.string().url().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});
export type PayPalCreateOrderRequest = z.infer<
  typeof PayPalCreateOrderRequestSchema
>;

/**
 * PayPal Order Status
 */
export const PayPalOrderStatus = z.enum([
  "CREATED",
  "SAVED",
  "APPROVED",
  "VOIDED",
  "COMPLETED",
  "PAYER_ACTION_REQUIRED",
]);
export type PayPalOrderStatus = z.infer<typeof PayPalOrderStatus>;

/**
 * PayPal Link
 */
export const PayPalLinkSchema = z.object({
  href: z.string(),
  rel: z.string(),
  method: z.string().optional(),
});
export type PayPalLink = z.infer<typeof PayPalLinkSchema>;

/**
 * PayPal Order Response
 */
export const PayPalOrderResponseSchema = z.object({
  id: z.string(),
  status: PayPalOrderStatus,
  payment_source: z.record(z.string(), z.unknown()).optional(),
  purchase_units: z.array(z.record(z.string(), z.unknown())).optional(),
  payer: z.record(z.string(), z.unknown()).optional(),
  links: z.array(PayPalLinkSchema).optional(),
  create_time: z.string().optional(),
  update_time: z.string().optional(),
});
export type PayPalOrderResponse = z.infer<typeof PayPalOrderResponseSchema>;

/**
 * PayPal Capture Response
 */
export const PayPalCaptureResponseSchema = z.object({
  id: z.string(),
  status: z.enum([
    "COMPLETED",
    "DECLINED",
    "PARTIALLY_REFUNDED",
    "PENDING",
    "REFUNDED",
    "FAILED",
  ]),
  payment_source: z.record(z.string(), z.unknown()).optional(),
  purchase_units: z
    .array(
      z.object({
        reference_id: z.string().optional(),
        payments: z
          .object({
            captures: z
              .array(
                z.object({
                  id: z.string(),
                  status: z.string(),
                  amount: PayPalMoneySchema,
                  final_capture: z.boolean().optional(),
                  create_time: z.string().optional(),
                  update_time: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  payer: z.record(z.string(), z.unknown()).optional(),
  links: z.array(PayPalLinkSchema).optional(),
});
export type PayPalCaptureResponse = z.infer<typeof PayPalCaptureResponseSchema>;

/**
 * PayPal Webhook Event Types
 */
export const PayPalWebhookEvents = {
  PAYMENT_CAPTURE_COMPLETED: "PAYMENT.CAPTURE.COMPLETED",
  PAYMENT_CAPTURE_DENIED: "PAYMENT.CAPTURE.DENIED",
  PAYMENT_CAPTURE_PENDING: "PAYMENT.CAPTURE.PENDING",
  PAYMENT_CAPTURE_REFUNDED: "PAYMENT.CAPTURE.REFUNDED",
  CHECKOUT_ORDER_APPROVED: "CHECKOUT.ORDER.APPROVED",
  CHECKOUT_ORDER_COMPLETED: "CHECKOUT.ORDER.COMPLETED",
  CHECKOUT_PAYMENT_APPROVAL_REVERSED: "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
} as const;

export type PayPalWebhookEvent =
  (typeof PayPalWebhookEvents)[keyof typeof PayPalWebhookEvents];

/**
 * PayPal Webhook Payload
 */
export const PayPalWebhookPayloadSchema = z.object({
  id: z.string(),
  event_version: z.string().optional(),
  create_time: z.string(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string().optional(),
  resource: z.record(z.string(), z.unknown()),
  links: z.array(PayPalLinkSchema).optional(),
});
export type PayPalWebhookPayload = z.infer<typeof PayPalWebhookPayloadSchema>;

/**
 * PayPal Access Token Response
 */
export const PayPalAccessTokenResponseSchema = z.object({
  scope: z.string(),
  access_token: z.string(),
  token_type: z.string(),
  app_id: z.string(),
  expires_in: z.number(),
  nonce: z.string().optional(),
});
export type PayPalAccessTokenResponse = z.infer<
  typeof PayPalAccessTokenResponseSchema
>;

/**
 * PayPal Error Response
 */
export const PayPalErrorResponseSchema = z.object({
  name: z.string(),
  message: z.string(),
  debug_id: z.string().optional(),
  details: z
    .array(
      z.object({
        field: z.string().optional(),
        value: z.string().optional(),
        location: z.string().optional(),
        issue: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  links: z.array(PayPalLinkSchema).optional(),
});
export type PayPalErrorResponse = z.infer<typeof PayPalErrorResponseSchema>;
