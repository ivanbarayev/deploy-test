CREATE TYPE "public"."_projectfe_payments_payment_provider" AS ENUM('nowpayments', 'paypal');--> statement-breakpoint
CREATE TYPE "public"."_projectfe_payments_payment_status" AS ENUM('pending', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'refunded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."_projectfe_payments_payment_type" AS ENUM('deposit', 'subscription', 'one_time');--> statement-breakpoint
CREATE TABLE "_projectfe_core-db_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "_projectfe_core-db_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "_projectfe_core-db_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "_projectfe_core-db_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "_projectfe_core-db_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "_projectfe_core-db_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "_projectfe_core-db_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_projectfe_core-db_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_projectfe_payments_provider_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"provider" "_projectfe_payments_payment_provider" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"api_key" text,
	"api_secret" text,
	"webhook_secret" text,
	"config" jsonb,
	"sandbox_mode" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_projectfe_payments_provider_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_projectfe_payments_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"external_id" text,
	"provider" "_projectfe_payments_payment_provider" NOT NULL,
	"status" "_projectfe_payments_payment_status" DEFAULT 'pending' NOT NULL,
	"type" "_projectfe_payments_payment_type" DEFAULT 'one_time' NOT NULL,
	"user_id" integer,
	"project_id" text,
	"requested_amount" numeric(18, 8) NOT NULL,
	"requested_currency" text NOT NULL,
	"received_amount" numeric(18, 8),
	"received_currency" text,
	"pay_address" text,
	"pay_currency" text,
	"pay_amount" numeric(18, 8),
	"outcome_address" text,
	"outcome_currency" text,
	"order_id" text,
	"order_description" text,
	"invoice_url" text,
	"last_webhook_at" timestamp with time zone,
	"webhook_count" integer DEFAULT 0 NOT NULL,
	"last_status_check_at" timestamp with time zone,
	"provider_metadata" jsonb,
	"client_metadata" jsonb,
	"last_error" text,
	"expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_projectfe_payments_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_projectfe_payments_webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer,
	"provider" "_projectfe_payments_payment_provider" NOT NULL,
	"external_id" text,
	"event_type" text,
	"raw_payload" jsonb NOT NULL,
	"raw_headers" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"source_ip" text,
	"signature_valid" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_projectfe_payments_webhook_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "_projectfe_core-db_account" ADD CONSTRAINT "_projectfe_core-db_account_user_id__projectfe_core-db_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."_projectfe_core-db_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "_projectfe_core-db_session" ADD CONSTRAINT "_projectfe_core-db_session_user_id__projectfe_core-db_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."_projectfe_core-db_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clerkId_uniqueIndex" ON "_projectfe_core-db_users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_config_project_provider_idx" ON "_projectfe_payments_provider_configs" USING btree ("project_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_idempotency_key_idx" ON "_projectfe_payments_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_external_id_idx" ON "_projectfe_payments_transactions" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "payment_user_id_idx" ON "_projectfe_payments_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "_projectfe_payments_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_provider_idx" ON "_projectfe_payments_transactions" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payment_project_id_idx" ON "_projectfe_payments_transactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "payment_order_id_idx" ON "_projectfe_payments_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_created_at_idx" ON "_projectfe_payments_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_log_transaction_id_idx" ON "_projectfe_payments_webhook_logs" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "webhook_log_external_id_idx" ON "_projectfe_payments_webhook_logs" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "webhook_log_provider_idx" ON "_projectfe_payments_webhook_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "webhook_log_created_at_idx" ON "_projectfe_payments_webhook_logs" USING btree ("created_at");