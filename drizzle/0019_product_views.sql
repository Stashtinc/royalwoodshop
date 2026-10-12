-- Product page visits on this site, added to legacy_views (the WordPress count).
ALTER TABLE products ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;
