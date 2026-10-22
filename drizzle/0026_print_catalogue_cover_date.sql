-- Cover date stamp for a print catalogue. Empty means the date the PDF is printed.
ALTER TABLE print_catalogues ADD COLUMN IF NOT EXISTS cover_date varchar(60);
