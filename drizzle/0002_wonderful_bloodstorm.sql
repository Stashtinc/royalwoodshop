ALTER TABLE "activity_log" ADD COLUMN "level" varchar(12) DEFAULT 'detail' NOT NULL;--> statement-breakpoint
-- Entries recorded before this column existed defaulted to 'detail'.
-- Promote the ones that were always milestones.
UPDATE "activity_log" SET "level" = 'milestone' WHERE "action" IN (
  'import.species', 'site.published', 'product.created', 'product.archived',
  'product.restored', 'product.status', 'setup.catalogue', 'setup.redirects', 'setup.schema'
);
