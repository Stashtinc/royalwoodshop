# Running the website: a guide for Royal Wood Shop staff

Everything below happens in the admin at **www.royalwoodshop.com/admin**. The
menu on the left has Dashboard, Products, Categories, Blog, Media, Import and
Logs. **View site ↗** opens the public site; **Sign out** is at the bottom.

Changes to products, prices, categories and the menu appear on the public site
as soon as you save. The blog is the exception (see *Known problems*).

## Signing in

- Use your email address and password. You stay signed in for 14 days.
- Five wrong passwords in 15 minutes locks sign-in for 15 minutes. It locks
  your email address, and also everyone sharing the shop's internet connection,
  so if you are unsure of a password, stop and ask rather than guessing.
- There is no "forgot password" button. Stasht sets up new logins and resets
  passwords (see *When something goes wrong*).
- If you open an admin link while signed out, you go back to that page after
  signing in.

## Dashboard

- **Catalogue**: how many products are published, and three cards that should
  reach 0: *Awaiting species*, *Awaiting availability* and *No description*.
  Click a card to see the products it counts.
- **Google Search Console**: clicks, impressions, position and top searches
  over the last 28 days (figures run two days behind).
- **Google Analytics**: visitors, page views and where they came from over the
  last 28 days (one day behind).
- An amber *Hidden from search engines* banner means Google is being kept out.
  It should disappear once the site is live on www.royalwoodshop.com.

## Products

**Finding one.** Products → type a name, product code or web address in the
search box, or filter by type and species. Archived products only show under
the *Archived* type.

**Editing.** Click a product, change what you need, press **Save changes**.
If you try to leave with unsaved changes the site asks first.

- **Status**: *Published* is on the site; *Draft* is not yet; *Archived* is
  hidden but kept (and can be brought back with *Activate*).
- **Species & availability**: one dropdown per species: *— not milled —*,
  *milled, no code*, *In Stock*, *Quick Ship*, *Made-to-Order*. The product's
  overall availability is worked out from these; you cannot set it directly.
  *Other* only accepts species the site already knows.
- **Price and sale price**: plain numbers only (e.g. 12.50). Anything else is
  cleared. A sale price shows an *On Sale* badge.
- **Sizes**: thickness and width in decimal inches (5-1/4 is 5.25).
- **Categories**: tick where it belongs. With more than one, choose the
  primary (★): it decides the product's web address.
- **Search listing**: leave blank to use the wording shown in grey, or write
  your own page title and description.
- Changing a product's name does not change its web address.

**Images.** Drag photos onto the drop area (JPG, PNG, WebP or AVIF, up to
12 MB). For each image choose its type:

- *Profile drawing*: shown whole, never cropped.
- *Photograph* and *Installed*: fill the frame.

Use ↑/↓ to reorder; the first image is the one on catalogue cards. Give each
image a short description (it is read aloud to blind visitors and helps Google).

**Archive rather than delete.** *Archive* hides a product and can be undone.
*Delete product* cannot be undone and also deletes its images.

**New products** start as drafts: *Add New* → fill in → *Create product*, then
open it again to add images and publish.

## Categories

Add, rename, reorder (▲/▼) and choose which appear in the top menu (*In nav*).
Renaming changes only the name shown, not the web address. **Deleting a
category cannot be undone**: its products lose that category (and, where it was
their primary, their web address changes), and its sub-categories become
top-level categories. Ask Stasht before deleting one that has products.

## The Master Product List (Import)

The spreadsheet is the fastest way to update many products at once.

1. **Import → Download Master** saves today's list as a spreadsheet.
2. Edit it: species ticks are **S** (In Stock), **QS** (Quick Ship) or **MO**
   (Made-to-Order). Blank cells for name, description, size and price are left
   alone. Image names must match files already in the Media library.
3. **Upload** it and press **Check the file**. Nothing changes yet: the preview
   lists what would change, new products, unknown codes and missing images.
   Fix anything unexpected in the spreadsheet and check again.
4. Press **Apply** when the preview is right.

Read *Known problems* before applying a list.

## Media library

All the site's images. Search by file name, filter by used/unused, type,
category or species. Click an image for its details.

- **Upload** WebP, JPG or PNG files (up to 10 MB). The file name is kept; this
  is how you put images where the Master List can find them.
- Uploading a file with the same name as an existing one **replaces it**.
- **Rename** updates the products that use the image. If nothing seems to
  happen, the new name is probably taken: try another.
- **Delete** cannot be undone and does not check whether a product uses the
  image. Check *Used by* first.

## Blog

Blog → **Write an article**, or click one to edit. The editor has headings,
bold, lists and links; pasted text loses its formatting. Fill in the summary
(shown on the blog page), choose categories and a header image, and set
**Status**. New articles are *Published* by default: choose *Draft* if it is
not ready. **AI Assist** can draft an article, the summary and search listing,
or a header image; always read and correct what it writes before using it.

## Activity log

Logs shows who changed what. *Site changes* shows the big events (imports,
publishing, new products); *Everything* shows every edit and sign-in. Search
for a product, article, person or action. Everyday detail is kept for 90 days.
Several *Sign-in failed* entries from an address nobody recognises are worth
mentioning to Stasht.

## Enquiries and newsletter

- Messages from the **contact form** are emailed to info@royalwoodshop.com.
- **Newsletter** signups go to Mailchimp. People are only added once they click
  the confirmation email Mailchimp sends them.

## Known problems

Being fixed; until then:

- **Blog changes do not appear on the public site by themselves.** New,
  edited, published or unpublished articles show on the site only after Stasht
  publishes them. Tell Stasht when you have changed an article.
- **Applying a Master List:**
  - it replaces every listed product's species with what the sheet ticks, so a
    species marked *milled, no code* (a blank cell in the download) is removed;
  - it publishes every draft product that has a category, not only those in
    the sheet;
  - products missing from the sheet are **not** archived, despite what the
    preview says. Archive them by hand in Products.
- **Removing an image from a product deletes the image file**, even if another
  product uses the same picture. Check Media → *Used by* first.

## When something goes wrong

Contact Stasht, the web developer: *[contact details to be added]*. Say what you
were doing, the page's web address, and the exact message on screen (a
screenshot is ideal). Urgent: the site is down or the contact form is failing.
Can wait a day: anything else.
