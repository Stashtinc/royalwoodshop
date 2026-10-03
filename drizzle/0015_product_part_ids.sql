-- The supplier/ERP code for each species a product is sold in, e.g. CAS-302 in
-- poplar is CAS-302-AP-R. One row per Part ID: Flex comes in several lengths,
-- and some species (White Pine, SPF) are not on the site's species list, so
-- this cannot live on the species tick in product_attributes.

CREATE TABLE IF NOT EXISTS product_part_ids (
  id serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  species varchar(60) NOT NULL,
  part_id varchar(80) NOT NULL,
  name varchar(200),
  uom varchar(20),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_part_ids_part_id_idx ON product_part_ids (part_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_part_ids_product_idx ON product_part_ids (product_id);
