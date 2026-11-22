-- Print style for a catalogue (fonts, colours, sizes, rules). Null means the defaults.
ALTER TABLE print_catalogues ADD COLUMN IF NOT EXISTS style jsonb;
