# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Where the catalogue data comes from

Postgres is the source of truth. The site is prerendered to static HTML, so the
data is read once at build time rather than on every request.

```
Postgres  ──sync:data──▶  src/data/products.json  ──build──▶  547 static pages
```

```bash
npm run sync:data     # refresh the snapshot from Postgres (needs DATABASE_URL)
npm run build         # prerender every page
```

`src/data/db.server.js` reads from Postgres when `DATABASE_URL` is set and falls
back to the committed `products.json` snapshot when it is not — so a fresh
clone, or CI without secrets, still builds. The snapshot is committed
deliberately for that reason.

**Publishing flow once the admin panel exists:** edit in the admin → Postgres →
`sync:data` → `build` → deploy. Until then, `npm run import:species` in the
database project loads Brad's sheet, then `sync:data` here pulls it through.

### Species and availability

Both come from the audit sheet Royal Wood Shop are completing.

- **Species** is many-to-many (`product_attributes`) — a profile is genuinely
  milled in several woods.
- **Availability** is a single mandatory value on the product: In Stock, Quick
  Ship or Special Order.
- **Flex** is a boolean flag, not a species.

Filters hide any facet with no data behind it, so a partially completed sheet
degrades gracefully: the species filter appears only once species exist, and
grows as more come back. Products without species show "Unspecified" rather
than a misleading "wood".## Setup

Everything lives in this one project — the website, the database schema, the
migrations and the import scripts. There is a single schema definition at
`src/db/schema.js`.

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Create the database

Sign up at [neon.tech](https://neon.tech) (free at this size), create a project
called `royalwoodshop`, and copy the **pooled** connection string. Paste it into
`.env` as `DATABASE_URL`.

### 3. Create the tables and load the catalogue

```bash
npm run db:setup
```

**Stop the dev server first.** With no `DATABASE_URL` this uses an embedded
PostgreSQL stored in `.data/pg`, and that allows only one process at a time —
if the server is running it holds the database open and the migrations will not
reach it. The script verifies every table exists before reporting success.

Eleven tables. Use `npm run db:studio` any time you want to browse the data in a
browser rather than a terminal.

### 4. Load the catalogue

```bash
npm run import:products     # 539 rows -> 535 products (see duplicate slugs below)
npm run import:redirects    # 2,732 legacy URLs
```

### 5. Load the species sheet, when it comes back

In Google Sheets: **File → Download → Comma-separated values** with the
`TO DO — Species` tab selected. Save it as `data/species.csv`, stop the dev
server, then:

```bash
npm run import:species
```

The export includes the instruction rows above the headers; the importer finds
the header row itself, so the file needs no tidying.

Safe to run against a partly completed sheet — run it again each time Brad sends
more. It reports which product codes it could not match and any value in the
OTHER column that is not a recognised species.

### 6. Publish

```bash
npm run sync:data     # pull the catalogue from Postgres into products.json
npm run build         # prerender 549 static pages + generate _redirects
```

Netlify runs step 6 for you on every push once the repository is connected.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Live preview at localhost while you work |
| `npm run db:studio` | Browse and edit the database in a browser |
| `npm run sync:data` | Refresh the snapshot from Postgres |
| `npm run build` | Prerender the whole site |




## If the local database will not open

The embedded database allows one process at a time and does not survive two
writing at once — running a database script while the dev server is up can
corrupt it. Symptom: `RuntimeError: Aborted()` from pglite on startup.

Rebuild it. Nothing is lost that is not reproducible from `data/`:

```bash
# stop the dev server first
rm -rf .data
npm run db:setup
npm run admin:create-user -- you@example.com "your password" "Your Name"
npm run dev
```

This is a property of the embedded database, not of PostgreSQL. On a server
with a real PostgreSQL, concurrent connections are the normal case and this
cannot happen.
