-- Door heights are the Height attribute now, so the six "NN" Height" sub-categories
-- under Interior Doors are removed. First, every product filed under one of them gets
-- its Height tick and its height number (only where it is missing); then the links
-- and the six sub-categories are deleted. Re-runnable: nothing is left to delete the second time.

-- 1. Height values for every height in the old sub-categories.
INSERT INTO attribute_values (attribute_id, slug, value, sort_order)
SELECT a.id, s.n::text, s.n::text || '"', s.n
FROM attributes a
JOIN (SELECT DISTINCT substring(c.name from '^([0-9]+)')::int AS n FROM categories c WHERE c.name ~ '^[0-9]+" Height$') s ON true
WHERE a.key = 'height'
ON CONFLICT (attribute_id, slug) DO NOTHING;

-- 2. Height tick for each product filed under a height sub-category.
INSERT INTO product_attributes (product_id, attribute_value_id)
SELECT DISTINCT pc.product_id, av.id
FROM product_categories pc
JOIN categories c ON c.id = pc.category_id AND c.name ~ '^[0-9]+" Height$'
JOIN attributes a ON a.key = 'height'
JOIN attribute_values av ON av.attribute_id = a.id AND av.slug = substring(c.name from '^([0-9]+)')
ON CONFLICT DO NOTHING;

-- 3. The number, where the product has none.
UPDATE products p
SET height_in = sub.h
FROM (
  SELECT pa.product_id, MIN(av.slug::numeric) AS h
  FROM product_attributes pa
  JOIN attribute_values av ON av.id = pa.attribute_value_id
  JOIN attributes a ON a.id = av.attribute_id AND a.key = 'height'
  GROUP BY pa.product_id
) sub
WHERE p.id = sub.product_id AND p.height_in IS NULL;

-- 4. Nothing may point at the sub-categories being removed.
UPDATE products SET primary_category_id = NULL
WHERE primary_category_id IN (SELECT id FROM categories WHERE name ~ '^[0-9]+" Height$');
DELETE FROM product_categories
WHERE category_id IN (SELECT id FROM categories WHERE name ~ '^[0-9]+" Height$');
DELETE FROM categories WHERE name ~ '^[0-9]+" Height$';
