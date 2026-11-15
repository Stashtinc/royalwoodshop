-- Blog excerpts: drop the WordPress [caption]…[/caption] shortcodes.
-- Two imported excerpts (Aria & Fittes vents, Wood vs. MDF) start with one, so
-- the /blog cards showed it as code. posts.json was fixed in d8ddc41, but /blog
-- reads the database first, so the stored excerpts need the same fix.
-- Safe to re-run: only rows that still contain a shortcode are touched.
UPDATE posts
SET excerpt = btrim(regexp_replace(excerpt, '\[caption[^\]]*\].*?\[/caption\]\s*', '', 'g'))
WHERE excerpt LIKE '%[caption%';
