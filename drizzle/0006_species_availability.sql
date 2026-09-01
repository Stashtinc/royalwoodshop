-- Availability moves from the product to the species tick.
--
-- Royal Wood Shop record it on the audit sheet by typing a code into each
-- wood's column (X = in stock, QS = quick ship, MTO = made to order), so a
-- profile can be in stock in poplar and made to order in walnut. The value on
-- `products` stays as the best of those, because the 449 products with no
-- species recorded yet still need somewhere to carry availability.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'availability' AND e.enumlabel = 'special_order'
  ) THEN
    ALTER TYPE "availability" RENAME VALUE 'special_order' TO 'made_to_order';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "product_attributes" ADD COLUMN IF NOT EXISTS "availability" "availability";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_attributes_availability_idx" ON "product_attributes" USING btree ("availability");
