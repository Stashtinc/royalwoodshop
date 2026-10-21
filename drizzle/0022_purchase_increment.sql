-- Purchase increment (purchase multiple): for linear-foot products, the length
-- in feet a quantity must be a whole multiple of (16 means 16, 32, 48 ...).
-- Null means any quantity. Filled from the Master Product List's
-- Purchase Increment column.

ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_increment numeric(8, 2);
