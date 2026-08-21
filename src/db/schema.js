import {
  pgTable, pgEnum, serial, integer, text, varchar, boolean, numeric,
  timestamp, primaryKey, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/* ------------------------------------------------------------------ enums */

/** Every product is exactly one of these. Mandatory, mutually exclusive.
 *  Collected from Royal Wood Shop on the Phase 0 audit sheet. */
export const availabilityEnum = pgEnum('availability', [
  'in_stock',
  'quick_ship',
  'special_order',
])

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'published',
  'archived',
])

export const imageRoleEnum = pgEnum('image_role', [
  'profile_drawing',   // the 3D line render, e.g. CAS-2M4-3D.jpg
  'product_photo',     // generated or photographed product image
  'installed_photo',   // in situ
])

export const userRoleEnum = pgEnum('user_role', ['admin', 'editor'])

/* ------------------------------------------------------------- categories */

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  parentId: integer('parent_id'),
  description: text('description'),
  seoTitle: varchar('seo_title', { length: 200 }),
  seoDescription: text('seo_description'),
  ogImageId: integer('og_image_id'),
  sortOrder: integer('sort_order').notNull().default(9999),
  /** A curated, indexable facet page rather than a real category —
   *  e.g. /products/trim-mouldings/white-oak/. See spec §2.4. */
  isPromotedFacet: boolean('is_promoted_facet').notNull().default(false),
  facetQuery: text('facet_query'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
  parentIdx: index('categories_parent_idx').on(t.parentId),
}))

/* --------------------------------------------------------------- products */

export const products = pgTable('products', {
  id: serial('id').primaryKey(),

  /** Original UPCP Item_ID. Kept so redirects and re-imports stay traceable. */
  legacyItemId: integer('legacy_item_id'),

  slug: varchar('slug', { length: 220 }).notNull(),
  productCode: varchar('product_code', { length: 60 }),
  name: varchar('name', { length: 300 }).notNull(),
  summary: text('summary'),
  description: text('description'),

  primaryCategoryId: integer('primary_category_id').references(() => categories.id),

  /** Parsed from the free-text size. Enables range filtering and correct sorting. */
  thicknessIn: numeric('thickness_in', { precision: 8, scale: 4 }),
  widthIn: numeric('width_in', { precision: 8, scale: 4 }),
  /** The original string, preserved for display: '3/4 X 2-3/4', '5/8 x 5" face'. */
  sizeDisplay: varchar('size_display', { length: 200 }),

  availability: availabilityEnum('availability'),
  leadTime: varchar('lead_time', { length: 120 }),

  /** Profile is also available as a flexible moulding.
   *  Recorded as a tick alongside species on the audit sheet, but it is a
   *  variant of the profile rather than a species, so it lives here. */
  flexAvailable: boolean('flex_available').notNull().default(false),

  price: numeric('price', { precision: 10, scale: 2 }),

  status: productStatusEnum('status').notNull().default('draft'),

  seoTitle: varchar('seo_title', { length: 200 }),
  seoDescription: text('seo_description'),
  ogImageId: integer('og_image_id'),

  /** Carried across from UPCP so popular products can be prioritised. */
  legacyViews: integer('legacy_views').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (t) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(t.slug),
  codeIdx: index('products_code_idx').on(t.productCode),
  catIdx: index('products_category_idx').on(t.primaryCategoryId),
  availIdx: index('products_availability_idx').on(t.availability),
  statusIdx: index('products_status_idx').on(t.status),
  widthIdx: index('products_width_idx').on(t.widthIn),
}))

export const productCategories = pgTable('product_categories', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.categoryId] }),
}))

/* ------------------------------------------------------------- attributes */

export const attributes = pgTable('attributes', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 60 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(9999),
}, (t) => ({
  keyIdx: uniqueIndex('attributes_key_idx').on(t.key),
}))

export const attributeValues = pgTable('attribute_values', {
  id: serial('id').primaryKey(),
  attributeId: integer('attribute_id').notNull().references(() => attributes.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 120 }).notNull(),
  value: varchar('value', { length: 160 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(9999),
}, (t) => ({
  uniq: uniqueIndex('attribute_values_attr_slug_idx').on(t.attributeId, t.slug),
}))

export const productAttributes = pgTable('product_attributes', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  attributeValueId: integer('attribute_value_id').notNull().references(() => attributeValues.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.attributeValueId] }),
  valueIdx: index('product_attributes_value_idx').on(t.attributeValueId),
}))

/* ----------------------------------------------------------------- images */

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  /** Required. The legacy site auto-generated '{title}-image', which is worthless. */
  altText: varchar('alt_text', { length: 300 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  role: imageRoleEnum('role').notNull().default('product_photo'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index('product_images_product_idx').on(t.productId),
}))

export const relatedProducts = pgTable('related_products', {
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  relatedProductId: integer('related_product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.relatedProductId] }),
}))

/* -------------------------------------------------------------- redirects */

/** Editable in the admin without a deploy. 2,148 product redirects at launch,
 *  across four legacy URL patterns. See spec §3. */
export const redirects = pgTable('redirects', {
  id: serial('id').primaryKey(),
  fromPath: varchar('from_path', { length: 500 }).notNull(),
  toPath: varchar('to_path', { length: 500 }).notNull(),
  statusCode: integer('status_code').notNull().default(301),
  hits: integer('hits').notNull().default(0),
  lastHitAt: timestamp('last_hit_at', { withTimezone: true }),
  note: varchar('note', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fromIdx: uniqueIndex('redirects_from_idx').on(t.fromPath),
}))

/** Unmatched 404s, so gaps in the redirect map surface instead of hiding. */
export const notFoundLog = pgTable('not_found_log', {
  id: serial('id').primaryKey(),
  path: varchar('path', { length: 500 }).notNull(),
  referrer: varchar('referrer', { length: 500 }),
  hits: integer('hits').notNull().default(1),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pathIdx: uniqueIndex('not_found_log_path_idx').on(t.path),
}))

/* ------------------------------------------------------------------ users */

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 160 }),
  role: userRoleEnum('role').notNull().default('editor'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
}))

/* ------------------------------------------------------------------ blog */

export const postStatusEnum = pgEnum('post_status', ['draft', 'published'])

/** Articles. Their web addresses are kept exactly as the WordPress site used
 *  them — these are the best-ranking pages on the site and changing them would
 *  cost hard-won position for no benefit. */
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  legacyId: integer('legacy_id'),
  slug: varchar('slug', { length: 220 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  excerpt: text('excerpt'),
  contentHtml: text('content_html'),
  featuredImage: text('featured_image'),
  featuredImageAlt: varchar('featured_image_alt', { length: 300 }),
  status: postStatusEnum('status').notNull().default('draft'),
  seoTitle: varchar('seo_title', { length: 200 }),
  seoDescription: text('seo_description'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('posts_slug_idx').on(t.slug),
  publishedIdx: index('posts_published_idx').on(t.publishedAt),
  statusIdx: index('posts_status_idx').on(t.status),
}))

export const postCategories = pgTable('post_categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
}, (t) => ({ slugIdx: uniqueIndex('post_categories_slug_idx').on(t.slug) }))

export const postsToCategories = pgTable('posts_to_categories', {
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => postCategories.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.postId, t.categoryId] }) }))

/* --------------------------------------------------------- activity log */

/** Who changed what, and when.
 *
 *  The actor's email is copied in rather than joined, so the history survives
 *  a user being removed — an audit trail that disappears with the account is
 *  not much of an audit trail. */
export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  userEmail: varchar('user_email', { length: 254 }),
  action: varchar('action', { length: 60 }).notNull(),
  /** 'milestone' — changed many things at once, or changed what the public
   *  sees. 'detail' — a single field, an image, a sign-in. Milestones are the
   *  default view and are kept indefinitely; detail is pruned after 90 days. */
  level: varchar('level', { length: 12 }).notNull().default('detail'),
  entityType: varchar('entity_type', { length: 40 }),
  entityId: integer('entity_id'),
  entityLabel: varchar('entity_label', { length: 300 }),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdIdx: index('activity_log_created_idx').on(t.createdAt),
  entityIdx: index('activity_log_entity_idx').on(t.entityType, t.entityId),
}))

/* ------------------------------------------- search console (Google) cache */

/** Google's Search Analytics API is slow (1–3s) and rate limited, and its data
 *  only settles after ~2 days. So we never call it from a page load: a cached
 *  row is served immediately and refreshed in the background once it is older
 *  than the TTL. One row per (property, report) pair; payload is the raw JSON
 *  we shaped for the dashboard. */
export const searchConsoleCache = pgTable('search_console_cache', {
  id: serial('id').primaryKey(),
  /** The GSC property, exactly as Google names it, e.g.
   *  'http://www.cbeckermann.com/' or 'sc-domain:royalwoodshop.com'. */
  siteUrl: varchar('site_url', { length: 300 }).notNull(),
  /** 'summary' | 'trend' | 'queries' | 'pages' | 'coverage' */
  report: varchar('report', { length: 40 }).notNull(),
  payload: text('payload').notNull(),
  /** Null when the last refresh succeeded. Holds the message when it did not,
   *  so the dashboard can say what is wrong instead of showing nothing. */
  error: text('error'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('search_console_cache_key_idx').on(t.siteUrl, t.report),
}))

/** Cached Google Analytics reports. Same shape and same reasoning as the
 *  Search Console cache above: the dashboard must render from the database
 *  without waiting on Google, and must be able to say what went wrong rather
 *  than show an empty panel. One row per (property, report) pair. */
export const analyticsCache = pgTable('analytics_cache', {
  id: serial('id').primaryKey(),
  /** The GA4 numeric property id, e.g. '312678442'. Not the measurement id
   *  (G-XXXXXXX) and not the account id — the Data API wants the property. */
  propertyId: varchar('property_id', { length: 40 }).notNull(),
  /** 'summary' | 'trend' | 'pages' | 'channels' */
  report: varchar('report', { length: 40 }).notNull(),
  payload: text('payload').notNull(),
  error: text('error'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('analytics_cache_key_idx').on(t.propertyId, t.report),
}))

/* -------------------------------------------------------------- relations */

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parent' }),
  products: many(productCategories),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  primaryCategory: one(categories, { fields: [products.primaryCategoryId], references: [categories.id] }),
  categories: many(productCategories),
  attributes: many(productAttributes),
  images: many(productImages),
}))

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}))

export const attributeValuesRelations = relations(attributeValues, ({ one, many }) => ({
  attribute: one(attributes, { fields: [attributeValues.attributeId], references: [attributes.id] }),
  products: many(productAttributes),
}))

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, { fields: [productAttributes.productId], references: [products.id] }),
  value: one(attributeValues, { fields: [productAttributes.attributeValueId], references: [attributeValues.id] }),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}))
