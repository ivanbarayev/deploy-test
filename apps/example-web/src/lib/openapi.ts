/**
 * OpenAPI/Swagger specification generator for the payments API
 * This file defines the OpenAPI specification for all API endpoints
 */

import { env } from "~/env";

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Payment Gateway API",
    description:
      "Comprehensive REST API for managing payments with multiple payment providers (NowPayments, PayPal). Includes webhook handling, payment status tracking, and administrative endpoints.",
    version: "1.0.0",
    contact: {
      name: "ProjectFE",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: env.NEXT_PUBLIC_PROJECT_HOME_URL,
      description: "API Server",
    },
  ],
  paths: {
    "/api/payments": {
      post: {
        summary: "Create a new payment",
        description: "Initiate a payment transaction with a specified provider",
        tags: ["Payments"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider", "amount", "currency"],
                properties: {
                  provider: {
                    type: "string",
                    enum: ["nowpayments", "paypal"],
                    description: "Payment provider to use",
                    example: "nowpayments",
                  },
                  amount: {
                    type: "number",
                    format: "float",
                    description: "Payment amount",
                    example: 99.99,
                    minimum: 0.01,
                  },
                  currency: {
                    type: "string",
                    description: "Currency code (ISO 4217)",
                    example: "USD",
                    minLength: 3,
                    maxLength: 10,
                  },
                  payCurrency: {
                    type: "string",
                    description:
                      "Payment currency (cryptocurrency for NowPayments)",
                    example: "BTC",
                  },
                  orderId: {
                    type: "string",
                    description: "External order/reference ID",
                    example: "ORDER-12345",
                  },
                  orderDescription: {
                    type: "string",
                    description: "Description of the payment",
                    example: "Premium subscription renewal",
                  },
                  successUrl: {
                    type: "string",
                    format: "uri",
                    description: "URL to redirect on successful payment",
                  },
                  cancelUrl: {
                    type: "string",
                    format: "uri",
                    description: "URL to redirect on cancelled payment",
                  },
                  userId: {
                    type: "number",
                    description: "User ID associated with payment",
                    example: 123,
                  },
                  projectId: {
                    type: "string",
                    description: "Project ID associated with payment",
                  },
                  metadata: {
                    type: "object",
                    description: "Additional metadata for the payment",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Payment created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "Payment ID",
                    },
                    provider: {
                      type: "string",
                      enum: ["nowpayments", "paypal"],
                    },
                    amount: {
                      type: "number",
                    },
                    currency: {
                      type: "string",
                    },
                    status: {
                      type: "string",
                      enum: ["pending", "confirmed", "finished", "failed"],
                    },
                    paymentUrl: {
                      type: "string",
                      format: "uri",
                      description: "URL to complete payment",
                    },
                    createdAt: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid request parameters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                    },
                    details: {
                      type: "array",
                      items: {
                        type: "object",
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
          },
        },
      },
      get: {
        summary: "List payments",
        description: "Retrieve a list of payments with optional filtering",
        tags: ["Payments"],
        parameters: [
          {
            name: "provider",
            in: "query",
            schema: {
              type: "string",
              enum: ["nowpayments", "paypal"],
            },
            description: "Filter by payment provider",
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "pending",
                "confirming",
                "confirmed",
                "sending",
                "partially_paid",
                "finished",
                "failed",
                "expired",
                "refunded",
              ],
            },
            description: "Filter by payment status",
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 10,
            },
            description: "Maximum number of results",
          },
          {
            name: "offset",
            in: "query",
            schema: {
              type: "integer",
              default: 0,
            },
            description: "Number of results to skip",
          },
        ],
        responses: {
          "200": {
            description: "List of payments",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                      },
                    },
                    total: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/payments/{id}": {
      get: {
        summary: "Get payment details",
        description: "Retrieve details of a specific payment",
        tags: ["Payments"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
            },
            description: "Payment ID",
          },
        ],
        responses: {
          "200": {
            description: "Payment details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                    },
                    provider: {
                      type: "string",
                    },
                    amount: {
                      type: "number",
                    },
                    currency: {
                      type: "string",
                    },
                    status: {
                      type: "string",
                    },
                    createdAt: {
                      type: "string",
                      format: "date-time",
                    },
                    updatedAt: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Payment not found",
          },
        },
      },
    },
    "/api/webhooks/nowpayments": {
      post: {
        summary: "NowPayments IPN Webhook",
        description: "Receive payment status updates from NowPayments",
        tags: ["Webhooks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  payment_id: {
                    type: "integer",
                    description: "NowPayments payment ID",
                  },
                  parent_payment_id: {
                    type: "integer",
                  },
                  invoice_id: {
                    type: ["string", "null"],
                  },
                  payment_status: {
                    type: "string",
                    enum: [
                      "waiting",
                      "confirming",
                      "confirmed",
                      "sending",
                      "partially_paid",
                      "finished",
                      "failed",
                      "expired",
                      "refunded",
                    ],
                  },
                  pay_address: {
                    type: "string",
                    description: "Payment address",
                  },
                  price_amount: {
                    type: "number",
                  },
                  price_currency: {
                    type: "string",
                  },
                  pay_amount: {
                    type: "number",
                  },
                  actually_paid: {
                    type: "number",
                  },
                  pay_currency: {
                    type: "string",
                  },
                  purchase_id: {
                    type: "string",
                  },
                  outcome_amount: {
                    type: "number",
                  },
                  outcome_currency: {
                    type: "string",
                  },
                  fee: {
                    type: "object",
                    properties: {
                      currency: {
                        type: "string",
                      },
                      depositFee: {
                        type: "number",
                      },
                      withdrawalFee: {
                        type: "number",
                      },
                      serviceFee: {
                        type: "number",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "received",
                    },
                    processed: {
                      type: "boolean",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Invalid webhook signature",
          },
          "500": {
            description: "Server error",
          },
        },
      },
    },
    "/api/callbacks/nowpayments": {
      post: {
        summary: "NowPayments Callback Handler",
        description: "Alternative webhook endpoint for NowPayments payments",
        tags: ["Callbacks"],
        responses: {
          "200": {
            description: "Callback processed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                    },
                    processed: {
                      type: "boolean",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/callbacks/paypal": {
      post: {
        summary: "PayPal Webhook Handler",
        description: "Receive webhook notifications from PayPal",
        tags: ["Callbacks"],
        responses: {
          "200": {
            description: "Webhook processed",
          },
        },
      },
    },
    "/api/webhooks/sign": {
      post: {
        summary: "Generate webhook signature",
        description:
          "Generate HMAC-SHA512 signature for testing NowPayments webhooks",
        tags: ["Webhooks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["payload"],
                properties: {
                  payload: {
                    type: "object",
                    description: "Webhook payload to sign",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Signature generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    payload: {
                      type: "object",
                    },
                    signature: {
                      type: "string",
                      description: "HMAC-SHA512 signature",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Missing payload",
          },
          "500": {
            description: "Signature generation failed",
          },
        },
      },
    },
    "/api/webhooks/logs": {
      get: {
        summary: "Get webhook logs",
        description: "Retrieve webhook logs for debugging",
        tags: ["Webhooks"],
        parameters: [
          {
            name: "provider",
            in: "query",
            schema: {
              type: "string",
              enum: ["nowpayments", "paypal"],
            },
            description: "Filter by payment provider",
          },
          {
            name: "transactionId",
            in: "query",
            schema: {
              type: "integer",
            },
            description: "Filter by transaction ID",
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              default: 50,
              maximum: 500,
            },
            description: "Maximum number of logs to return",
          },
        ],
        responses: {
          "200": {
            description: "Webhook logs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logs: {
                      type: "array",
                      items: {
                        type: "object",
                        description: "Webhook log entry",
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
    "/api/cron/check-payments": {
      post: {
        summary: "Check pending payment statuses (Cron Job)",
        description:
          "Periodic job to check and update pending payments. Requires CRON_SECRET authorization.",
        tags: ["Cron"],
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  provider: {
                    type: "string",
                    enum: ["nowpayments", "paypal"],
                  },
                  olderThanMinutes: {
                    type: "number",
                    minimum: 1,
                    maximum: 60,
                    default: 5,
                  },
                  limit: {
                    type: "number",
                    minimum: 1,
                    maximum: 100,
                    default: 100,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cron job completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                    checked: {
                      type: "integer",
                    },
                    updated: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
          "401": {
            $ref: "#/components/responses/Unauthorized",
          },
          "500": {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Bearer token for authenticated endpoints (e.g., cron jobs)",
      },
      WebhookSignature: {
        type: "apiKey",
        in: "header",
        name: "X-NOWPAYMENTS-SIG",
        description: "HMAC-SHA512 signature for NowPayments webhooks",
      },
    },
    schemas: {
      Payment: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          provider: {
            type: "string",
            enum: ["nowpayments", "paypal"],
          },
          amount: {
            type: "number",
          },
          currency: {
            type: "string",
          },
          status: {
            type: "string",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      CreatePaymentRequest: {
        type: "object",
        required: ["provider", "amount", "currency"],
        properties: {
          provider: {
            type: "string",
            enum: ["nowpayments", "paypal"],
            description: "Payment provider to use",
          },
          amount: {
            type: "number",
            format: "float",
            minimum: 0.01,
            description: "Payment amount",
            example: 99.99,
          },
          currency: {
            type: "string",
            minLength: 3,
            maxLength: 10,
            description: "Currency code (ISO 4217)",
            example: "USD",
          },
          payCurrency: {
            type: "string",
            description: "Payment currency (crypto for NowPayments)",
            example: "BTC",
          },
          orderId: {
            type: "string",
            description: "External order ID",
          },
          orderDescription: {
            type: "string",
            description: "Payment description",
          },
          successUrl: {
            type: "string",
            format: "uri",
          },
          cancelUrl: {
            type: "string",
            format: "uri",
          },
          userId: {
            type: "number",
          },
          projectId: {
            type: "string",
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      PaymentResponse: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          provider: {
            type: "string",
            enum: ["nowpayments", "paypal"],
          },
          amount: {
            type: "number",
          },
          currency: {
            type: "string",
          },
          status: {
            type: "string",
          },
          paymentUrl: {
            type: "string",
            format: "uri",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      PaymentListResponse: {
        type: "object",
        properties: {
          payments: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Payment",
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
          },
          message: {
            type: "string",
          },
        },
      },
      ValidationErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
          },
          details: {
            type: "array",
            items: {
              type: "object",
            },
          },
        },
      },
      NowPaymentsWebhookPayload: {
        type: "object",
        required: ["payment_id", "payment_status"],
        properties: {
          payment_id: {
            type: "integer",
            description: "Unique NowPayments payment ID",
          },
          payment_status: {
            type: "string",
            enum: [
              "waiting",
              "confirming",
              "confirmed",
              "sending",
              "partially_paid",
              "finished",
              "failed",
              "expired",
              "refunded",
            ],
            description: "Current payment status",
          },
          pay_address: {
            type: "string",
            description: "Cryptocurrency payment address",
          },
          price_amount: {
            type: "number",
            description: "Requested payment amount in fiat",
          },
          price_currency: {
            type: "string",
            description: "Fiat currency code",
          },
          pay_amount: {
            type: "number",
            description: "Expected crypto payment amount",
          },
          actually_paid: {
            type: "number",
            description: "Actual amount received in crypto",
          },
          pay_currency: {
            type: "string",
            description: "Cryptocurrency type",
          },
          purchase_id: {
            type: "string",
            description: "Your internal order/purchase ID",
          },
          outcome_amount: {
            type: "number",
            description: "Final settled amount after fees",
          },
          outcome_currency: {
            type: "string",
            description: "Final settled currency",
          },
          fee: {
            type: "object",
            properties: {
              currency: {
                type: "string",
              },
              depositFee: {
                type: "number",
              },
              withdrawalFee: {
                type: "number",
              },
              serviceFee: {
                type: "number",
              },
            },
          },
        },
      },
      WebhookResponse: {
        type: "object",
        properties: {
          status: {
            type: "string",
            example: "received",
          },
          processed: {
            type: "boolean",
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ValidationErrorResponse",
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      Unauthorized: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
    },
  },
};
