-- Hide a product from the public site. It stays in the admin and in print catalogues.
ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden_from_site boolean NOT NULL DEFAULT false;
