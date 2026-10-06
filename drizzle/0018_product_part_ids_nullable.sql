-- A material can carry a price before it has a Part ID
ALTER TABLE product_part_ids ALTER COLUMN part_id DROP NOT NULL;
