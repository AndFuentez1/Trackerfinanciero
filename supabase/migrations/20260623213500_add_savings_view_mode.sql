ALTER TABLE "public"."user_configs" ADD COLUMN IF NOT EXISTS "savings_view_mode" text DEFAULT 'monthly';
