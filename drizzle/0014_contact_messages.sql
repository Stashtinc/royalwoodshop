-- Messages sent through the public contact form. Stored before any email is
-- attempted, so a mail outage never loses an enquiry.

CREATE TABLE IF NOT EXISTS contact_messages (
  id serial PRIMARY KEY,
  name varchar(160) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(40),
  message text NOT NULL,
  ip varchar(64),
  emailed_at timestamp with time zone,
  email_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at);
