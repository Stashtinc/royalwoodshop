-- Remembers which product codes each species sheet carried.
--
-- The sheet has never covered the whole catalogue (473 codes against 533
-- products), so a product being absent from it does not mean it is
-- discontinued. Comparing one sheet against the previous one does say what
-- Royal Wood Shop have taken out, and that is the only safe basis for
-- archiving anything.

CREATE TABLE IF NOT EXISTS "species_import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar(300),
	"user_email" varchar(254),
	"row_count" integer DEFAULT 0 NOT NULL,
	"matched" integer DEFAULT 0 NOT NULL,
	"codes" text NOT NULL,
	"archived" text,
	"baseline" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_import_runs_created_idx" ON "species_import_runs" USING btree ("created_at");
