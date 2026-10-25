-- Which categories an attribute applies to (e.g. Height under Interior Doors).
-- An attribute is shown in the admin under each of its categories.

CREATE TABLE IF NOT EXISTS attribute_categories (
  attribute_id integer NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (attribute_id, category_id)
);
