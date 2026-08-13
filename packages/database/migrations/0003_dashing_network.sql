CREATE TABLE IF NOT EXISTS "ws_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"ticket_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ws_tickets_ticket_hash_unique" UNIQUE("ticket_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ws_tickets" ADD CONSTRAINT "ws_tickets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ws_tickets_session_id_idx" ON "ws_tickets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ws_tickets_expires_at_idx" ON "ws_tickets" USING btree ("expires_at");