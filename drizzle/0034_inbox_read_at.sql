-- Admin inbox: track which enquiries and quote requests have been opened.
-- Null read_at = new. Opening an entry sets it. Safe to re-run.
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS read_at timestamptz;
