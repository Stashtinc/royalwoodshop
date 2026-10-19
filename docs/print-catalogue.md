# Print Catalogue: findings and proposal

Status: research and proposal only. No code has changed for this feature yet.
Branch: `print-catalogue` (off `main`). Do not merge to `staging` or `main` until the feature is ready.

## Goal

Staff pick products in the admin (one at a time or in bulk), put them in an order, and download one PDF:

- a cover page with an editable title
- then the products in rows on 8-1/2 x 11 portrait pages: image, name, code, description, full specifications, and price when switched on

Catalogues are saved, and can be reprinted later with the current product details.

---

## 1. The existing single-product PDF (spec sheet)

**Library:** `pdfkit` (0.17) for layout, `sharp` for images. Both in `package.json`.

**Files:**
- `src/routes/spec-sheet.js` is the route, served at `/products/:category/:slug/spec-sheet.pdf`. `?download=1` sends it as an attachment. Otherwise it is inline, so Print opens it in the browser's PDF viewer.
- `src/lib/spec-sheet.server.js` (140 lines) is the builder. `renderSpecSheet(product)` returns a Buffer.

**How it works:**
- The route loads every product with `loadAllProducts()` (`src/lib/products.server.js`). That reads the live database first, and falls back to the static snapshot `src/data/products.json` only when there is no database.
- `renderSpecSheet` builds a LETTER page with `PDFDocument`. It draws a letterhead, the title and code, up to two pictures, a two-column spec table, the description (cut to fit), and a footer with the address.
- Fonts are the built-in PDF fonts (Times-Bold, Helvetica). No font files are embedded.

**Images:**
- `loadImage(url)` takes an image URL. Uploads are read from disk, from `UPLOAD_DIR` or `public/uploads` (`/uploads/...` paths). Other `http(s)` URLs are fetched.
- Images are converted to PNG with `sharp`, resized to 1200px wide, and flattened on white, because PDFs cannot embed WebP.
- A missing image is skipped rather than failing the page.

**Spec rows** (what the single sheet shows): product code, size, specifications (the species list), category, type (sub-categories), availability label, lead time. Rows with no value are dropped.

**Reuse:** `loadImage` is private to `spec-sheet.server.js`. The print catalogue needs it too, so it should move to a shared module first (see proposal).

---

## 2. Admin structure

**Routes:** `src/routes.js`. The admin is nested under one layout:

```
route('admin/login', ...)
route('admin', 'routes/admin/layout.jsx', [
  index → dashboard.jsx
  products → products.jsx          products/new → product-new.jsx
  products/:id → product-edit.jsx
  catalogue → catalogue.jsx        (placeholder: "Coming soon" + tabs)
  logs, posts, posts/:id, categories, import, media, ...
  export-master, export-products-json, export-images   (file downloads)
])
```

**Login check:** `requireUser(request)` in `src/lib/auth.server.js`. Every protected loader and action calls it first. It redirects to `/admin/login?next=...` when there is no session. The admin layout's loader calls it too, so every admin child route is protected. A new route that is under `admin` still calls `requireUser` in its own loader, as the placeholder does.

**Layout:** `src/routes/admin/layout.jsx` has the sidebar (Dashboard, Products, Categories, Blog, Media, Import, Logs), the mobile drawer, the sign-out form, and the `Outlet`. Icons are inline SVG with the same stroke style.

**Shared admin components** (`src/components/admin/`):
- `SectionTabs.jsx`: Products | Catalogue tabs (with icons)
- `ConfirmDialog.jsx`: `useConfirm()` hook and `ConfirmForm` (use instead of `window.confirm`)
- `Pagination.jsx`
- `SpeciesPicker.jsx`: species grid, Add Species, Part IDs, prices
- `CategoryPicker.jsx`, `ImageDropZone.jsx`, `MediaPicker.jsx`, `UomSelect.jsx`, `ProductCodeInput.jsx`, `SeoFields.jsx`, `RichText.jsx`, `Toast.jsx`, `useDragReorder.js`

**Products list** (`src/routes/admin/products.jsx`): a table with checkboxes, a search box, filters (types, categories, species), pagination, and a Bulk Edit mode with a selection set (`selectedIds`). Bulk actions go through `ConfirmForm` and `intent` fields on the form.

**Admin queries:** `src/lib/admin-queries.server.js` (`listProducts`, `saveProduct`, `saveProductPartIds`, and others).

**Activity log:** `log(user, action, {...})` from `src/lib/activity.server.js`. Use it for saves and deletes.

---

## 3. Where the data lives

Schema: `src/db/schema.js`. The Postgres database is Neon or Railway in production. Locally it is an embedded Postgres in `.data/pg`.

| Data | Table(s) | Notes |
|---|---|---|
| Product (name, code, slug, summary, description) | `products` | `name`, `product_code`, `slug`, `summary`, `description` (text, can be long) |
| Size and dimensions | `products` | `size_display` (e.g. `3/4 X 1-1/2`), `thickness_in`, `width_in` |
| Availability (product level) | `products.availability`, `flex_availability` | enum: `in_stock`, `quick_ship`, `made_to_order` (label "Stock Item" since 2026-10-16) |
| Lead time, unit of measure | `products.lead_time`, `products.uom` | |
| Price (product level) | `products.price`, `products.sale_price` | numeric(10,2) |
| Species and availability per species | `product_attributes` joined to `attribute_values` and `attributes` (key `species`) | `product_attributes.availability` holds the per-species availability |
| Part IDs and prices per species | `product_part_ids` | `species`, `part_id`, `price`, `sale_price` (strings). A species with no Part ID can still have a price row |
| Categories | `categories` (tree via `parent_id`), `product_categories` | primary category is `products.primary_category_id` |
| Images | `product_images` | `storage_key` is the URL or `/uploads/...` path; `role` is `profile_drawing`, `product_photo` or `installed_photo`; `sort_order`. Image choice rule is in `src/db/queries.js` (line ~112) |
| Related products | `related_products` | not needed for the catalogue |
| Status | `products.status` | `draft`, `published`, `archived` |

**Read path for public pages:** `getAllProducts(db)` in `src/db/queries.js` builds the product object used by the product page and the spec sheet. It includes `species`, `speciesAvailability`, `partIds`, `images`, `categories`. The print catalogue should use this same function so it shows what the site shows.

**Price display:** the public site shows the product price, and the Part ID table shows per-species prices. Which price the catalogue shows is an open question (see below).

---

## 4. Database migrations

- **Schema source:** `src/db/schema.js` (single file, Drizzle).
- **Config:** `drizzle.config.js` (output folder `drizzle/`, dialect `postgresql`).
- **Migration files:** plain SQL in `drizzle/`, numbered (`0001_…` to `0020_image_role_default.sql`), each with `--> statement-breakpoint` lines between statements. The `drizzle/meta/` folder holds snapshots from `drizzle-kit`.
- **Creating one:** write the next numbered `.sql` file by hand, and update `schema.js` to match. `npm run db:generate` (drizzle-kit) can produce the SQL and snapshot.
- **Applying in development:** the server applies any unrun migration on start, in embedded mode only, and records each in `_applied_migrations`.
- **Applying in production:** `npm run db:migrate -- 0021_print_catalogues.sql`. This runs only the named file, and skips statements that already exist. Run it after deploying a change that needs it. Never run `npm run db:setup` on production: it re-imports the catalogue, redirects and blog from CSV, overwriting admin edits. Never replay all migrations on production: 0010 and 0011 reset category names and order.

---

## 5. Proposal

### Where it lives

**Admin pages** (all behind `requireUser`):
- `/admin/catalogue`: list of saved catalogues (title, product count, last changed), with "New catalogue". Replaces the placeholder.
- `/admin/catalogue/:id`: builder. Editable title, a show-prices switch, an ordered list of products (drag to reorder, remove), an "Add products" search, and "Download PDF".
- `/admin/catalogue/:id/pdf`: returns the PDF (`Content-Disposition: attachment`). Loader calls `requireUser`. Not public.
- Adding from the products list: a row action and a bulk action ("Add N to catalogue…") that opens a small picker with an existing catalogue or "new". Keep the Products table otherwise unchanged.

**Server code:**
- `src/lib/pdf-images.server.js`: move `loadImage` out of `spec-sheet.server.js` so both PDFs share it. Behaviour stays the same.
- `src/lib/print-catalogue.server.js`: `renderPrintCatalogue(catalogue, products, { showPrices })` returns a Buffer. It draws the cover page, then product rows across pages. It uses the same spec rows as the spec sheet.
- `src/lib/print-catalogues.server.js`: create, load, save, reorder, delete catalogues (database access, `log()` calls).

### New tables (one migration)

`drizzle/0021_print_catalogues.sql`, plus matching definitions in `src/db/schema.js`:

```
print_catalogues
  id serial pk
  title varchar(200) not null default 'Product Catalogue'
  show_prices boolean not null default false
  created_by_email varchar(255)
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()

print_catalogue_items
  id serial pk
  catalogue_id integer not null references print_catalogues(id) on delete cascade
  product_id integer not null references products(id) on delete cascade
  sort_order integer not null default 0
  unique (catalogue_id, product_id)
```

Items store only the product ID, so a reprint reads the current product data. Nothing is copied.

### Suggested build order (9 chunks)

Each chunk ends with something that can be tested. Confirm the order when you start.

1. Move `loadImage` to `pdf-images.server.js`. No behaviour change. Check the spec sheet still renders.
2. Migration `0021` and the schema for the two tables. Apply it to the dev database.
3. Catalogue list page (`/admin/catalogue`) with create and delete, replacing the placeholder.
4. Builder page: title, show-prices switch, add and remove products by search.
5. Reorder items (drag, reusing `useDragReorder`).
6. "Add to catalogue" from the Products list: row action and bulk action.
7. PDF renderer: cover page with the title and date.
8. PDF product rows: image, name, code, description, spec rows, page breaks.
9. Price column when switched on, PDF download button, final QA on phone and desktop. Then merge.

### Open questions for you

1. **Price when a product has per-species prices:** show the product's `price` and `sale_price`, or list a price for each species from the Part ID rows, or "from $X"?
2. **Image per product:** use the first `profile_drawing` (as the site does), the first `product_photo`, or let staff pick one per product?
3. **Deleted or archived products already in a catalogue:** skip them in the PDF with a note, or remove them from the catalogue when they are archived?
4. **Cover page:** title only, or also a date, letterhead and a contact block (address and phone as on the spec sheet)?
5. **Who can build catalogues:** all admin users, or only some?
