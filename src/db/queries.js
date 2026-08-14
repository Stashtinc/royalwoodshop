import { eq, sql, asc, desc, and, inArray } from 'drizzle-orm'
import {
  products, categories, attributes, attributeValues, productAttributes, productImages,
} from './schema.js'

const CATEGORY_NAMES = {
  'trim-mouldings': 'Trim and Mouldings',
  'interior-doors': 'Interior Doors',
  'door-hardware': 'Door Hardware',
  'stair-railing': 'Stairs & Railings',
}

const SIZE_BAND = (w) => {
  if (w == null) return 'Made to order'
  if (w < 2) return 'Under 2"'
  if (w < 4) return '2" – 4"'
  if (w < 7) return '4" – 7"'
  return 'Over 7"'
}

const AVAILABILITY_LABEL = {
  in_stock: 'In Stock',
  quick_ship: 'Quick Ship',
  special_order: 'Special Order',
}

/**
 * Every published product, shaped for the UI.
 *
 * Species arrives from `product_attributes`, which is populated by the
 * species sheet Royal Wood Shop are completing. Products with no species yet
 * simply come back with an empty array — the filters hide values that have no
 * products behind them, so a partially completed sheet degrades gracefully.
 */
export async function getAllProducts(db) {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      productCode: products.productCode,
      name: products.name,
      description: products.description,
      sizeDisplay: products.sizeDisplay,
      thicknessIn: products.thicknessIn,
      widthIn: products.widthIn,
      availability: products.availability,
      flexAvailable: products.flexAvailable,
      leadTime: products.leadTime,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      legacyViews: products.legacyViews,
      categorySlug: categories.slug,
      species: sql`coalesce(
        (select array_agg(av.value order by av.sort_order)
         from ${productAttributes} pa
         join ${attributeValues} av on av.id = pa.attribute_value_id
         join ${attributes} a on a.id = av.attribute_id and a.key = 'species'
         where pa.product_id = ${products.id}), '{}')`.as('species'),
      subcategory: sql`coalesce(
        (select c2.name from ${categories} c2
         join product_categories pc on pc.category_id = c2.id
         where pc.product_id = ${products.id} and c2.parent_id is not null
         limit 1), 'Other')`.as('subcategory'),
      image: sql`(select pi.storage_key from ${productImages} pi
                  where pi.product_id = ${products.id}
                  order by pi.sort_order limit 1)`.as('image'),
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(eq(products.status, 'published'))
    .orderBy(asc(products.productCode), asc(products.name))

  return rows.map(shape)
}

function shape(r) {
  const width = r.widthIn == null ? null : Number(r.widthIn)
  const catSlug = r.categorySlug && CATEGORY_NAMES[r.categorySlug] ? r.categorySlug : 'trim-mouldings'
  const species = Array.isArray(r.species) ? r.species : []
  return {
    id: r.slug,
    slug: r.slug,
    productCode: r.productCode ?? '',
    name: r.name,
    description: r.description ?? '',
    category: CATEGORY_NAMES[catSlug],
    categorySlug: catSlug,
    subcategory: r.subcategory || 'Other',
    size: r.sizeDisplay ?? '',
    sizeCategory: SIZE_BAND(width),
    thicknessIn: r.thicknessIn == null ? null : Number(r.thicknessIn),
    widthIn: width,
    species,
    // The old free-text Material column is superseded by species. Until the
    // sheet is complete, fall back so the filter is never empty for a product.
    material: species.length ? species.join(', ') : 'Unspecified',
    availability: r.availability ?? null,
    availabilityLabel: r.availability ? AVAILABILITY_LABEL[r.availability] : null,
    flexAvailable: !!r.flexAvailable,
    leadTime: r.leadTime ?? null,
    image: r.image ?? '',
    seoTitle: r.seoTitle ?? '',
    seoDescription: r.seoDescription ?? '',
    views: r.legacyViews ?? 0,
  }
}

export async function getProductBySlug(db, slug) {
  const all = await getAllProducts(db)
  return all.find((p) => p.slug === slug) ?? null
}
