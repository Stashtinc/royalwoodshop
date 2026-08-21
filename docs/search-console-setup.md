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

## Step 4 — Install the key

Put the downloaded JSON file in the project's `.secrets/` folder (gitignored),
then run one command:

```sh
npm run gsc:connect -- .secrets/royal-wood-shop-site-abc123.json
```

That writes the key into `.env` correctly and then tests it end to end — it
authenticates with Google, confirms the service account can actually see the
property, pulls 28 days of real figures, and prints them.

Doing it by hand is possible but easy to get wrong. The private key contains real
line breaks, and a `.env` value that spans lines is truncated at the first break —
producing a key that looks right in the file and is rejected by Google. The
quoting is fussy too: dotenv expands escapes inside double quotes but does not
understand `\"`, so a JSON payload has to be written in **single** quotes to be
read back verbatim. The script handles both.

If something is not right, the script says which thing:

- key rejected → the file is damaged, create a fresh one
- account sees no properties → not added in Search Console yet, or added as
  Restricted rather than Full
- account sees other properties but not this one → `GSC_SITE_URL` does not match;
  it lists the ones it can see so you can copy the exact spelling

Delete the file from `.secrets/` once it reports Connected — the key now lives in
`.env`. Then restart the server.

To re-test later without a file: `npm run gsc:connect`.

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

---

# Google Analytics

The dashboard also shows Google Analytics figures — users, sessions, page views,
average session length, a daily trend, the most-viewed pages, and where the
traffic came from.

It reuses **the same service-account key** as Search Console. There is no second
key to create. But being a user in Search Console does not make it a user in
Analytics, so it has to be granted access separately, and the Analytics API has
to be switched on. Two steps.

## 1. Enable the Analytics Data API

In [Google Cloud Console](https://console.cloud.google.com/), with the **same
project** the service-account key came from:

1. APIs & Services → **Enable APIs and services**
2. Search for **Google Analytics Data API**
3. Enable

Missing this step gives a 403 that says the API "has not been used in project…".
The panel repeats that message rather than showing an empty chart.

## 2. Add the service account to the property

In [Google Analytics](https://analytics.google.com/):

1. **Admin** (bottom left)
2. Under the **Property** column → **Property access management**
3. **+** → **Add users**
4. Paste the service account's email — the one ending
   `.iam.gserviceaccount.com`, shown on the dashboard panel if you are unsure
5. Role: **Viewer**. Untick "Notify new users by email" — it is not a mailbox.
6. Add

## 3. Set the property id

```
GA4_PROPERTY_ID=312678442
```

**This is the one thing that is easy to get wrong.** Analytics shows three
different numbers and only one of them works here:

| Number | Looks like | Is it the one? |
|---|---|---|
| Account id | `6939042` | No — that is the account containing the property |
| Measurement id | `G-XXXXXXXXXX` | No — that is for the tracking tag on the page |
| **Property id** | `312678442` | **Yes** |

Find it under Admin → Property → **Property details**, top right. It is also the
number shown under the property name in the account picker.

Restart after changing `.env` — it is read at startup.

## How it behaves

- Same caching as Search Console: stored in the database, refreshed at most every
  6 hours, never blocking the page render. **Refresh** forces a pull.
- **Data runs one day behind.** GA4 fills the current day in as it goes, so
  including today would show a drop every morning that isn't real.
- If the service account has not been added, or the API is not enabled, the panel
  says which — with the exact email address to add.
