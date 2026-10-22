-- Print catalogues: a saved selection of products, printed as one PDF.
-- Items hold product IDs only, so a reprint shows the current product details.

CREATE TABLE IF NOT EXISTS print_catalogues (
  id serial PRIMARY KEY,
  title varchar(200) NOT NULL DEFAULT 'Product Catalogue',
  show_prices boolean NOT NULL DEFAULT false,
  cover_image_key text,
  created_by_email varchar(255),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS print_catalogue_items (
  id serial PRIMARY KEY,
  catalogue_id integer NOT NULL REFERENCES print_catalogues(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS print_catalogue_items_unique ON print_catalogue_items (catalogue_id, product_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS print_catalogue_items_order_idx ON print_catalogue_items (catalogue_id, sort_order);
