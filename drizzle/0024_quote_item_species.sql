-- Get a Quote: the wood a line is quoted in, when the product is sold in more
-- than one (its purchase increment depends on the wood).

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS species varchar(60);
