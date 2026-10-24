-- Product height in inches (80 means 80"), for the height filter on the catalogue.
-- Null means no height recorded. Filled from the Master Product List's Height column.

ALTER TABLE products ADD COLUMN IF NOT EXISTS height_in numeric(6, 2);
