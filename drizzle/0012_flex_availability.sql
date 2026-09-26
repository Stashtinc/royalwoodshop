-- Flex availability: in_stock / quick_ship / made_to_order, or null when the
-- profile is not offered as a flexible moulding. Added to the schema in
-- 557c8b6 without a migration, so fresh databases were missing it.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "flex_availability" "availability";
