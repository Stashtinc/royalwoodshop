UPDATE categories SET name = 'Trim & Moulding' WHERE slug = 'trim-mouldings' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET name = 'Stair & Railing' WHERE slug = 'stair-railing' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET name = 'Exterior Siding' WHERE slug = 'siding' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 10 WHERE slug = 'trim-mouldings' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 20 WHERE slug = 'flat-stock-lumber' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 30 WHERE slug = 'interior-doors' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 40 WHERE slug = 'door-hardware' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 50 WHERE slug = 'wall-ceiling-panelling' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 60 WHERE slug = 'stair-railing' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 65 WHERE slug = 'stair-components' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 70 WHERE slug = 'sheet-stock' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 80 WHERE slug = 'siding' AND parent_id IS NULL;
--> statement-breakpoint
UPDATE categories SET sort_order = 90 WHERE slug = 'aria-fittes-floor-vents' AND parent_id IS NULL;
--> statement-breakpoint
INSERT INTO categories (slug, name, sort_order) VALUES ('flat-stock-lumber', 'Flat Stock Lumber', 20) ON CONFLICT (slug) DO UPDATE SET name = 'Flat Stock Lumber', sort_order = 20;
--> statement-breakpoint
INSERT INTO categories (slug, name, sort_order) VALUES ('aria-fittes-floor-vents', 'Aria Fittes Floor Vents', 90) ON CONFLICT (slug) DO UPDATE SET name = 'Aria Fittes Floor Vents', sort_order = 90;
