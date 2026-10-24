-- Copies each product's height from the old Interior Doors sub-categories
-- ("78" Height" ... "108" Height") into products.height_in.
--
-- Only fills products whose height is still empty. A product filed under two
-- different heights is skipped, so it can be fixed by hand. The sub-categories
-- themselves are left in place: the sidebar and product filing do not change.
--
-- Check before and after:
--   select count(*) from products where height_in is null and id in (
--     select pc.product_id from product_categories pc join categories c on c.id = pc.category_id
--     where c.name ~ '^[0-9]+" Height$');   -- products that should get a height

UPDATE products p
SET height_in = v.h
FROM (
  SELECT pc.product_id,
         MAX(CAST(substring(c.name from '^([0-9]+)') AS numeric)) AS h,
         COUNT(DISTINCT substring(c.name from '^([0-9]+)')) AS n
  FROM product_categories pc
  JOIN categories c ON c.id = pc.category_id
  WHERE c.name ~ '^[0-9]+" Height$'
  GROUP BY pc.product_id
) v
WHERE p.id = v.product_id
  AND p.height_in IS NULL
  AND v.n = 1;
