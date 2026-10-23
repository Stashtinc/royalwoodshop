-- Purchase increment moves from the product to each species Part ID: the
-- length in feet a Part ID's quantity must be a whole multiple of (16 means
-- 16, 32, 48 ...). Null means any quantity. The products column from 0022 is
-- no longer read by the site.

ALTER TABLE product_part_ids ADD COLUMN IF NOT EXISTS purchase_increment numeric(8, 2);
