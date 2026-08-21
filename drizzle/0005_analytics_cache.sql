CREATE TABLE IF NOT EXISTS "analytics_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" varchar(40) NOT NULL,
	"report" varchar(40) NOT NULL,
	"payload" text NOT NULL,
	"error" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_cache_key_idx" ON "analytics_cache" ("property_id","report");
