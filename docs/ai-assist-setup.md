# AI Assist in the blog editor

The article editor has an **AI Assist** button. It does three things:

- **Write an article** — give it a topic and any points it must cover, and it
  drafts the body.
- **Summary & search listing** — reads the article already written and proposes
  the summary, the search-listing title and the meta description.
- **Header image** — open the tab and it writes a description of the photograph
  based on your article. Edit it if you want something else, press Generate, and
  pick from three options. Pick one and you can describe a change to get three
  variations of *that* picture.

Everything ends in a preview with *Use* or *Discard*. Nothing is written into
the editor until it is accepted, and nothing is saved to the site until Save is
pressed as normal.

Each tab keeps its own result, so an article draft you have not accepted yet
survives switching to another tab and back — and the header image is based on it
even though it is not in the editor.

## Switching it on

One key covers all three. The button stays greyed out until it is set.

1. Go to <https://platform.openai.com/>, sign in, add a payment method.
   This is the API platform — a ChatGPT Plus subscription does not include API
   access, and they are billed separately.
2. **API keys → Create new secret key**. Copy it; the console will not show it
   again.
3. Add it to `.env` on the admin server:

```sh
OPENAI_API_KEY="sk-..."
```

Then check it works:

```sh
npm run ai:check
```

That confirms the key, confirms the two models the app defaults to are actually
available on your account, and makes one real text call. It deliberately does
not generate an image, since each set costs a few cents.

Restart the server.

### If a model is rejected

Model names change faster than this codebase. If the app reports that a model
does not exist, or that your account cannot use it, override the default:

```sh
# OPENAI_TEXT_MODEL="gpt-4o-mini"
# OPENAI_IMAGE_MODEL="gpt-image-1"
# OPENAI_IMAGE_SIZE="1536x1024"
```

`npm run ai:check` lists the models your account can actually use, so you can
copy an exact name rather than guess.

The app already retries automatically when a model rejects the requested image
size or JSON mode, so these variables are only needed for the model names
themselves.

## What it costs

- **Writing an article** — a fraction of a cent. Drafting all 37 existing
  articles from scratch would cost well under a dollar.
- **Summary and search listing** — less again.
- **Header images** — roughly 4–10¢ each, so 12–30¢ for a set of three.

Opening the Header image tab writes the description, which costs a fraction of a
cent. No image is rendered until Generate is pressed, so an accidental click on
that tab costs essentially nothing. Each set of three variations costs the same
as a fresh set.

Nothing runs in the background. Current prices:
<https://openai.com/api/pricing/>.

Every image that is kept is recorded in the activity log with its prompt, so
image spend is auditable. Text generation is not logged, being both cheap and
visible in the article itself.

## What it knows

The prompt includes who Royal Wood Shop is — trim, mouldings and interior doors,
GTA and York Region, since 1982 — the house voice, Canadian spelling, and a
sample of real product names pulled live from the catalogue. That last part
matters: without it the model invents plausible product names that do not exist.

It is explicitly told not to invent prices, dimensions, product codes, delivery
times, warranties, awards or customer quotes.

The description you write or edit covers the *subject*. The house look is
appended automatically, so there is no need to restate it — and no way to
accidentally drop it.

Header images share a fixed look: photographic interiors as shot for a Canadian
renovation magazine, natural window light, warm neutrals, realistic Ontario homes
rather than showhomes, landscape framing, no people, no text, no logos. That
consistency is the point — a blog whose header images are visibly from four
different generators reads as neglected.

## Refining an image

Once three options are on screen, picking one reveals a box to describe a change
— *make the trim white*, *shoot it from lower down*, *warmer light*. That produces
three variations of the picked image.

This uses the image **edit** endpoint rather than a new generation, which is the
difference that matters: editing keeps the room, the furniture and the framing
and changes only what you asked for. Regenerating from an amended description
would give a different house that happens to have white trim.

Variations can be refined again, and **← Back** returns to any earlier set, so
exploring is not a one-way door. *Start again from the description* abandons the
whole line and generates fresh.

## What still needs a human

**Read the draft before accepting it.** The model can be confidently wrong. Check
anything specific — product names, measurements, claims about what suits what —
against the catalogue. It is a first draft to edit, not copy to publish.

Accepting an article **replaces the whole body**. Accepting metadata
**overwrites** the summary and both search-listing fields. The title and the alt
text are the exceptions: neither is overwritten if you have already filled it in.

**Generated images are illustrative, not product photography.** The model will
happily render a room with crown moulding that resembles nothing Royal Wood Shop
sells. For an atmospheric header image that is fine. It is not fine if the image
is used in a way that implies "this is our product" — for that, the images need
to come from the real range.

Worth agreeing with Brad whether generated images should carry any disclosure. No
law currently requires it for this use in Canada, but some businesses prefer to
be explicit, and it is easier to decide now than to retrofit across 37 articles.

## Safety

Whatever the model returns as article HTML is stripped down to the tags the
editor itself can produce — `<p> <h2> <h3> <ul> <ol> <li> <blockquote> <strong>
<em> <a> <br>` — before it reaches the page. Scripts, iframes, images, inline
styles, event handlers and `javascript:` links are removed. This is not paranoia
about any particular model; it is that article HTML is rendered into the live
site, so anything landing there has to be constrained regardless of origin.

The API key is read only on the server. It is never sent to the browser.

## How generated images are stored

Options are held in the browser as data URLs while you choose, so discarded ones
never touch the disk. The chosen one goes through exactly the same pipeline as an
uploaded photo: converted to WebP, written at 320, 640, 960 and 1440 pixels wide
plus the full size, and stored in `public/uploads`. Nothing downstream can tell a
generated image from an uploaded one, which is what makes it safe to change your
mind later.

## If it fails

The dialog shows the reason rather than a generic error:

- *OpenAI rejected the API key* — wrong or revoked key
- *Rate limited, or the account is out of credit* — check billing
- *The model ... does not exist* — set `OPENAI_TEXT_MODEL` or
  `OPENAI_IMAGE_MODEL`
- *OpenAI refused the prompt* — the content filter rejected it; reword and retry
- *not enough text to summarise* — write the article first
- **Two of three images failed** — the remaining ones are still offered rather
  than the whole set being thrown away
