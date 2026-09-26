-- The three top-level categories the nav expects but that were only ever
-- created by the Master Product List import, so a fresh database was missing
-- them. Existing rows are left alone — the admin owns name, order and in_nav.

INSERT INTO categories (slug, name, sort_order, in_nav) VALUES ('wall-ceiling-panelling', 'Wall & Ceiling Panelling', 50, true) ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO categories (slug, name, sort_order, in_nav) VALUES ('sheet-stock', 'Sheet Stock', 70, true) ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO categories (slug, name, sort_order, in_nav) VALUES ('siding', 'Exterior Siding', 80, true) ON CONFLICT (slug) DO NOTHING;
