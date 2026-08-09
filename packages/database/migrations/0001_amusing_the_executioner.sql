CREATE TABLE IF NOT EXISTS "blue_moon_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blue_moon_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_pair_unique" UNIQUE("user_a_id","user_b_id"),
	CONSTRAINT "friendships_canonical_pair_order" CHECK ("friendships"."user_a_id" < "friendships"."user_b_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blue_moon_tokens" ADD CONSTRAINT "blue_moon_tokens_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blue_moon_tokens" ADD CONSTRAINT "blue_moon_tokens_consumed_by_user_id_users_id_fk" FOREIGN KEY ("consumed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blue_moon_tokens_owner_id_idx" ON "blue_moon_tokens" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_user_a_id_idx" ON "friendships" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_user_b_id_idx" ON "friendships" USING btree ("user_b_id");