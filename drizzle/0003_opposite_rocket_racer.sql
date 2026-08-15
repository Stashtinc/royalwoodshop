CREATE TYPE "public"."post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"legacy_id" integer,
	"slug" varchar(220) NOT NULL,
	"title" varchar(300) NOT NULL,
	"excerpt" text,
	"content_html" text,
	"featured_image" text,
	"featured_image_alt" varchar(300),
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"seo_title" varchar(200),
	"seo_description" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts_to_categories" (
	"post_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "posts_to_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_to_categories" ADD CONSTRAINT "posts_to_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts_to_categories" ADD CONSTRAINT "posts_to_categories_category_id_post_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."post_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_categories_slug_idx" ON "post_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_published_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" USING btree ("status");