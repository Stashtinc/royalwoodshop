-- Unit of measure: how the product is sold (Lft, Ea, SqFt, Kit, Pc).
--
-- New on the Master Product List. Nothing in the old site or the inventory
-- extracts carried it, so it starts empty and fills in from the sheet.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "uom" varchar(20);
