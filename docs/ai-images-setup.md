# AI header images for blog articles

The **Header image** tab in AI Assist generates a feature image for an article.
Claude reads the finished article and describes a photograph; an image model
renders three versions; you pick one.

## Why two providers

Anthropic's API does not generate images, so image generation needs a second
account. This is not a replacement for the Claude setup — both are used, for
different steps:

| Step | Provider |
|---|---|
| Writing the article | Anthropic (Claude) |
| Describing the photograph | Anthropic (Claude) |
| Rendering the image | OpenAI |

Splitting prompt-writing from rendering is deliberate. It means the prompt is
visible and editable before any money is spent, and the house look lives in one
place rather than in whatever the author happened to type.

## Switching it on

1. Go to <https://platform.openai.com/>, sign in, add a payment method.
   This is the API platform, not a ChatGPT subscription — a ChatGPT Plus plan
   does not include API access.
2. **API keys → Create new secret key**. Copy it.
3. Add to `.env` on the admin server:

```sh
OPENAI_API_KEY="sk-..."

# Both optional. Model names change; if the app reports that the model does
# not exist, set this to one your account can use.
# OPENAI_IMAGE_MODEL="gpt-image-1"
# OPENAI_IMAGE_SIZE="1536x1024"
```

Restart the server. The Header image tab becomes usable. It stays disabled until
*both* keys are set, since it needs Claude for the prompt and OpenAI for the
render.

## What it costs

Roughly 4–10¢ per image depending on the model, so about 12–30¢ for a set of
three. Nothing is generated unless someone presses the button, and discarded
options are never written to disk. Current prices:
<https://openai.com/api/pricing/>.

Every image that is actually kept is recorded in the activity log, with the
prompt, so spend is auditable.

## The house look

Every generated image is asked for the same treatment: photographic interiors as
shot for a Canadian renovation magazine, natural window light, warm neutrals,
realistic Ontario homes rather than showhomes, landscape framing, no people, no
text, no logos.

That consistency is the point. A blog whose header images are visibly from four
different generators reads as neglected.

Text is explicitly excluded because generated lettering renders as convincing
nonsense, and this is a header image rather than a poster.

## What still needs a human

**These are illustrative photographs, not product photography.** The model will
happily render a room with crown moulding that resembles nothing Royal Wood Shop
sells. For an atmospheric header image that is fine. It is not fine if the image
is used in a way that implies "this is our product" — for that, the images need
to come from the real range.

Worth agreeing with Brad whether generated images should carry any disclosure. No
law currently requires it for this use in Canada, but some businesses prefer to
be explicit, and it is easier to decide now than to retrofit across 37 articles.

**Alt text is generated too**, and applied only when the field is empty, so it
never overwrites alt text written by hand. Read it — it should describe what is
in the image, not repeat the article title.

## How the image is stored

Once chosen, it goes through exactly the same pipeline as an uploaded photo:
converted to WebP, written at 320, 640, 960 and 1440 pixels wide plus the full
size, and stored in `public/uploads`. Nothing downstream can tell the difference
between a generated image and an uploaded one, which is what makes it safe to
change your mind later.

## If it fails

- *OpenAI rejected the API key* — wrong or revoked key
- *Rate limited, or the account is out of credit* — check billing
- *The model ... does not exist* — set `OPENAI_IMAGE_MODEL`
- *OpenAI refused the prompt* — the content filter rejected it; reword the
  description and try again
- **Two of three failed** — the remaining ones are still offered rather than the
  whole set being thrown away
