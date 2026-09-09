ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "in_nav" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE categories SET in_nav = true WHERE slug IN ('trim-mouldings','flat-stock-lumber','interior-doors','door-hardware','wall-ceiling-panelling','stair-railing','sheet-stock','siding','aria-fittes-floor-vents') AND parent_id IS NULL;
