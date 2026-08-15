CREATE TABLE IF NOT EXISTS "search_console_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_url" varchar(300) NOT NULL,
	"report" varchar(40) NOT NULL,
	"payload" text NOT NULL,
	"error" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "search_console_cache_key_idx" ON "search_console_cache" USING btree ("site_url","report");
