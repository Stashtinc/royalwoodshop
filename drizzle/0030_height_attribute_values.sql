-- Height becomes a real attribute: a "Height" attribute under Interior Doors, with
-- one value per height (78", 80" ...), ticked on each product that has that height.
-- products.height_in stays in sync as a fallback until production is checked.
-- Safe to re-run: every insert skips what already exists.

INSERT INTO attributes (key, name, sort_order)
VALUES ('height', 'Height', 10)
ON CONFLICT (key) DO NOTHING;

INSERT INTO attribute_categories (attribute_id, category_id)
SELECT a.id, c.id
FROM attributes a, categories c
WHERE a.key = 'height' AND c.name = 'Interior Doors' AND c.parent_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO attribute_values (attribute_id, slug, value, sort_order)
SELECT a.id, h.n::int::text, h.n::int::text || '"', h.n::int
FROM attributes a
JOIN (SELECT DISTINCT height_in AS n FROM products WHERE height_in IS NOT NULL) h ON true
WHERE a.key = 'height'
ON CONFLICT (attribute_id, slug) DO NOTHING;

INSERT INTO product_attributes (product_id, attribute_value_id)
SELECT p.id, av.id
FROM products p
JOIN attributes a ON a.key = 'height'
JOIN attribute_values av ON av.attribute_id = a.id AND av.slug = p.height_in::int::text
WHERE p.height_in IS NOT NULL
ON CONFLICT DO NOTHING;
