# Production setup on Railway

What the production Railway service needs before www.royalwoodshop.com points at
it. `.env.example` explains every setting; this is the checklist.

Set variables under **the service → Variables**. Saving redeploys. Settings that
start with `VITE_` are baked in when the site is built, so they only take effect
after that redeploy.

Only the production project gets these. The other Railway project should have
auto-deploy turned off (or be deleted) so there are never two live copies.

## Required at launch

| Variable | Production value | Without it |
|---|---|---|
| `DATABASE_URL` | A reference to the Postgres service's `DATABASE_URL` | The site runs on an empty embedded database |
| `SESSION_SECRET` | A long random value: `openssl rand -base64 32` | Nobody can sign in to the admin |
| `UPLOAD_DIR` | The mount path of the service's volume (Settings → Volumes) | Uploaded images disappear on every deploy |
| `VITE_SITE_URL` | `https://www.royalwoodshop.com` | Falls back to the same address, so this is a safeguard |
| `VITE_SEARCH_INDEXING` | `on`, set on the day of the domain switch | Google is told not to crawl the site |
| `VITE_GTM_ID` | `GTM-TW6NDWG` | No traffic reaches Google Analytics |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | From the mailbox provider | Contact enquiries are saved but nobody is emailed |
| `CONTACT_TO` | `info@royalwoodshop.com` | Enquiries go to info@royalwoodshop.com anyway |
| `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID` | From Mailchimp | The newsletter form says signup is unavailable |

## For the admin dashboard panels

| Variable | Production value |
|---|---|
| `GSC_SITE_URL` | The royalwoodshop.com Search Console property, e.g. `sc-domain:royalwoodshop.com` |
| `GSC_SERVICE_ACCOUNT_JSON` | The service-account key, one line (docs/search-console-setup.md) |
| `GA4_PROPERTY_ID` | The numeric GA4 property ID, not `G-1P8FNMDH4N` |

## Optional

| Variable | Used for |
|---|---|
| `ANTHROPIC_API_KEY` | AI Assist writing in the blog editor (docs/ai-assist-setup.md) |
| `OPENAI_API_KEY` | AI Assist header images |
| `GITHUB_TOKEN` | The admin build log; raises GitHub's rate limit |

## One-time database step

The contact form stores enquiries in a table that older databases do not have.
From a machine with the production database's public URL:

```sh
DATABASE_URL="<production url>" npm run db:migrate -- 0014_contact_messages.sql
```

Running it twice does no harm. **Never run `npm run db:setup` against
production**: it re-imports the original spreadsheets and overwrites every edit
made in the admin since.

The old-site redirects need no step: the server reads `data/redirects.csv`
directly, and counts hits in the `redirects` table.

## Checking it worked

- `/admin/login`: signing in works.
- Upload an image in Media, redeploy, and it is still there.
- `/robots.txt`: says `Allow: /` once `VITE_SEARCH_INDEXING` is on.
- An old address such as `/mouldings/product/sho-moulding-sho305f/` answers with
  a 301 to the new site.
- The contact form: a test message arrives at `CONTACT_TO`.
- The newsletter: signing up sends a Mailchimp confirmation email.
- Google Analytics → Reports → Realtime shows your own visit.
