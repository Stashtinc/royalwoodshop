# AI Assist in the blog editor

The article editor has an **AI Assist** button. It does two things:

- **Write an article** — give it a topic and any points it must cover, and it
  drafts the body.
- **Summary & search listing** — reads the article already written and proposes
  the summary, the search-listing title and the meta description.

Both end in a preview with *Use* or *Discard*. Nothing is written into the editor
until it is accepted, and nothing is saved to the site until Save is pressed as
normal.

## Switching it on

The button is greyed out until an API key is set.

1. Go to <https://console.anthropic.com/>, sign in, and add a payment method.
   This is a pay-as-you-go API account and is separate from any Claude
   subscription — a Claude Pro plan does not include API access.
2. **API keys → Create key**. Copy it; the console will not show it again.
3. Add it to `.env` on the admin server:

```sh
ANTHROPIC_API_KEY="sk-ant-..."

# Optional. Defaults to Claude Haiku, which is fast and cheap. Switch to a
# larger model if the drafts are not good enough.
# ANTHROPIC_MODEL="claude-sonnet-5"
```

Restart the server.

## What it costs

Each article draft is one API call — a couple of thousand tokens in, one or two
thousand out. On Haiku that is a fraction of a cent; on Sonnet, a few cents.
Writing every one of the 37 existing articles from scratch would cost well under
a dollar on Haiku. Current prices: <https://www.anthropic.com/pricing>.

There is no background usage. Nothing is called unless someone presses Generate.

## What it knows

The prompt includes who Royal Wood Shop is — trim, mouldings and interior doors,
GTA and York Region, since 1982 — the house voice, Canadian spelling, and a
sample of real product names pulled live from the catalogue. That last part
matters: without it the model invents plausible product names that do not exist.

It is explicitly told not to invent prices, dimensions, product codes, delivery
times, warranties, awards or customer quotes.

## What still needs a human

**Read the draft before accepting it.** The model can be confidently wrong. Check
anything specific — product names, measurements, claims about what suits what —
against the catalogue. It is a first draft to edit, not copy to publish.

Accepting an article **replaces the whole body**. Accepting metadata **overwrites**
the summary and both search-listing fields. The title is the exception: an
existing title is never overwritten.

## Safety

Whatever the model returns is stripped down to the tags the editor itself can
produce — `<p> <h2> <h3> <ul> <ol> <li> <blockquote> <strong> <em> <a> <br>` —
before it reaches the page. Scripts, iframes, images, inline styles, event
handlers and `javascript:` links are removed. This is not paranoia about Claude;
it is that article HTML is rendered into the live site, so anything landing there
has to be constrained regardless of where it came from.

The API key is read only on the server. It is never sent to the browser.

## If it fails

The dialog shows the reason rather than a generic error:

- *Anthropic rejected the API key* — wrong or revoked key
- *out of credit* — top up the account
- *Rate limited* — wait and retry
- *not enough text to summarise* — write the article first
