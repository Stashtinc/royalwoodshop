-- Get a Quote: project enquiries with product lines and attached files.
-- Files are stored in the database (not public/uploads) because they are
-- customer documents.

CREATE TABLE IF NOT EXISTS quote_requests (
  id serial PRIMARY KEY,
  name varchar(160) NOT NULL,
  company varchar(160),
  email varchar(254) NOT NULL,
  phone varchar(40) NOT NULL,
  notes text,
  ip varchar(64),
  emailed_at timestamp with time zone,
  email_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS quote_requests_created_idx ON quote_requests (created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quote_items (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES quote_requests (id) ON DELETE CASCADE,
  product_id integer,
  product_code varchar(120),
  product_name varchar(300) NOT NULL,
  quantity integer NOT NULL,
  uom varchar(40),
  note varchar(500),
  position integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS quote_items_request_idx ON quote_items (request_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS quote_files (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES quote_requests (id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  content_type varchar(120) NOT NULL,
  size_bytes integer NOT NULL,
  data bytea NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS quote_files_request_idx ON quote_files (request_id);
