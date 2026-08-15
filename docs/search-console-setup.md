# Connecting Google Search Console to the dashboard

The admin dashboard shows live Search Console figures — clicks, impressions, CTR,
average position, top queries and top pages. This is how to switch it on.

You only do this once. Nothing here expires and nobody has to log in again
afterwards.

## Why it needs setup at all

Google does not let its Search Console dashboard be embedded in another site, and
there is no read-only link that would let our site fetch the numbers. The only way
in is Google's API, and the API needs an identity to authorise.

We use a **service account**: a Google identity that belongs to the website rather
than to a person. That matters because a personal login would break the dashboard
the day that person changes their password, turns on two-factor, or leaves the
company.

## Step 1 — Create the project and turn on the API

1. Go to <https://console.cloud.google.com/>.
2. Top-left project dropdown → **New project**. Name it something like
   `royal-wood-shop-site`. Create it, then make sure it is the selected project.
3. Go to **APIs & Services → Library**, search for **Google Search Console API**,
   open it, and press **Enable**.

## Step 2 — Create the service account and its key

1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Name it `search-console-reader`. No roles are needed on the next screen —
   permission is granted inside Search Console, not here. Press **Done**.
3. Click the new account in the list → **Keys** tab → **Add key → Create new key
   → JSON**. A `.json` file downloads.

Treat that file like a password. It is the only thing needed to read the account's
data, and Google will not issue you a second copy of it.

Inside it there is a line like:

```
"client_email": "search-console-reader@royal-wood-shop-site.iam.gserviceaccount.com",
```

Copy that address — the next step needs it.

## Step 3 — Give it access to the property

1. Open Search Console and select the property.
2. **Settings → Users and permissions → Add user**.
3. Paste the `client_email` address. Set permission to **Full**.

`Full` is required rather than `Restricted`: restricted users cannot read the
Search Analytics API. It grants no ability to change the site — it is a Search
Console permission, not a website one.

## Step 4 — Put both values in the environment

Two variables, in the admin server's `.env`:

```sh
# The property exactly as Google names it.
GSC_SITE_URL="http://www.cbeckermann.com/"

# The entire JSON key file, on one line, in single quotes.
GSC_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"...", ...}'
```

**`GSC_SITE_URL` has to match Google exactly.** `http://` and `https://` are
different properties to Google, and so are `www.` and bare. The safest way to get
it right is to copy the `resource_id` from the Search Console address bar and
URL-decode it:

```
https://search.google.com/search-console?resource_id=http%3A%2F%2Fwww.cbeckermann.com%2F
                                                     └──────────── this ─────────────┘
                                          decodes to:  http://www.cbeckermann.com/
```

A domain property looks different again — `sc-domain:royalwoodshop.com`. Use it
verbatim if that is what you have.

Restart the admin server. The panel appears on the dashboard.

## When Royal Wood Shop goes live

`cbeckermann.com` is a stand-in so the panel can be built and demonstrated. On
launch, change `GSC_SITE_URL` to the Royal Wood Shop property and repeat **step 3**
for it — the same service account can read any number of properties, so no new key
is needed.

## How it behaves

- **Figures are cached in the database** and refreshed at most every 6 hours. The
  dashboard never waits on Google to render; if the cache is stale, the page loads
  the old numbers and refreshes behind the scenes.
- **Refresh** forces an immediate pull.
- **Data runs two days behind.** That is Google, not us — Search Analytics is not
  final until then, and including yesterday would show a fake crash every day.
- **If it is misconfigured**, the panel says exactly what is wrong (wrong property,
  service account not added, bad key) rather than showing nothing.
- **"Pages appearing in search"** counts pages shown at least once in the window.
  It is not the indexed-page count — Google has never released an API for the
  Index Coverage report. A page can be indexed and never shown.

## Note on the current site

The site is set to `noindex` while it lives on a temporary address, so its own
Search Console figures will be zero until `VITE_SEARCH_INDEXING=on` is set on the
final domain. That is why the panel is pointed at an existing property for now —
it proves the plumbing works with real data.
