CREATE TABLE "api_key_entry_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key_secret_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"secret_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vault_entries" ADD COLUMN "category" varchar(50) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_key_entry_access" ADD CONSTRAINT "api_key_entry_access_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_entry_access" ADD CONSTRAINT "api_key_entry_access_entry_id_vault_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."vault_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_secret_access" ADD CONSTRAINT "api_key_secret_access_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_secret_access" ADD CONSTRAINT "api_key_secret_access_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "akea_key_entry_idx" ON "api_key_entry_access" USING btree ("api_key_id","entry_id");--> statement-breakpoint
CREATE INDEX "aksa_key_secret_idx" ON "api_key_secret_access" USING btree ("api_key_id","secret_id");