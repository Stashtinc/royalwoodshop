import { eq, asc, and, inArray, isNotNull, ne } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import {
  products, categories, productCategories,
  attributes, attributeValues, productAttributes, productImages,
} from '../../db/schema.js'
import { SPECIES } from '../../lib/catalogue-constants.js'

const AVAIL_TICK = { in_stock: 'S', quick_ship: 'QS', made_to_order: 'MO' }
const tick = (v) => AVAIL_TICK[v] ?? ''

// Column order exactly as the master workbook: Flex sits between PVC and Steel.
const SPECIES_BEFORE_FLEX = SPECIES.slice(0, SPECIES.indexOf('Steel'))
const SPECIES_AFTER_FLEX  = SPECIES.slice(SPECIES.indexOf('Steel'))

// Header labels exactly as the original workbook
const HEADERS = [
  'image name', 'Code', 'Product\n Name', '\n Category', 'type\nsub-cat',
  'Size', 'Description', 'Availability', 'Price',
  'uom\n (Lft, Ea, SqFt, Kit, Pc)',
  ...SPECIES_BEFORE_FLEX, 'Flex', ...SPECIES_AFTER_FLEX, 'Other',
]

// Column widths from the original workbook (in characters)
const COL_WIDTHS = [
  22, 16, 34, 19, 18, 20, 58, 12, 9, 12,
  6.51, 6.51, 6.51, 6.51, 6.51, 6.51, 6.51,
  6.51, 6.51, 6.51, 6.51, 6.51, 6.51, 6.51,
  6.51, 6.51, 6.51, 22,
]

// Cell styles matching the original header row
const HDR_FILL_DEFAULT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const HDR_FILL_OTHER   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7C7AC' } }
const HDR_FONT = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Arial' }
const HDR_ALIGNMENT = { horizontal: 'center', vertical: 'bottom', wrapText: true }

export async function loader({ request }) {
  await requireUser(request)

  const db = await getDb()

  const rows = await db
    .select({
      id: products.id,
      productCode: products.productCode,
      name: products.name,
      description: products.description,
      sizeDisplay: products.sizeDisplay,
      availability: products.availability,
      price: products.price,
      uom: products.uom,
      flexAvailable: products.flexAvailable,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.primaryCategoryId))
    .where(ne(products.status, 'archived'))
    .orderBy(asc(categories.name), asc(products.productCode), asc(products.name))

  if (!rows.length) {
    return new Response('No products found.', { status: 404 })
  }

  const ids = rows.map((r) => r.id)

  const subRows = await db
    .select({ productId: productCategories.productId, subName: categories.name })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(isNotNull(categories.parentId), inArray(productCategories.productId, ids)))

  const subsByProduct = new Map()
  for (const { productId, subName } of subRows) {
    if (!subsByProduct.has(productId)) subsByProduct.set(productId, [])
    subsByProduct.get(productId).push(subName)
  }

  const speciesRows = await db
    .select({
      productId: productAttributes.productId,
      speciesName: attributeValues.value,
      availability: productAttributes.availability,
    })
    .from(productAttributes)
    .innerJoin(attributeValues, eq(attributeValues.id, productAttributes.attributeValueId))
    .innerJoin(attributes, eq(attributes.id, attributeValues.attributeId))
    .where(and(eq(attributes.key, 'species'), inArray(productAttributes.productId, ids)))

  const speciesByProduct = new Map()
  for (const { productId, speciesName, availability } of speciesRows) {
    if (!speciesByProduct.has(productId)) speciesByProduct.set(productId, new Map())
    speciesByProduct.get(productId).set(speciesName, availability)
  }

  const imageRows = await db
    .select({ productId: productImages.productId, storageKey: productImages.storageKey })
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.sortOrder))

  // Keep only the first (lowest sortOrder) image per product
  const imageByProduct = new Map()
  for (const { productId, storageKey } of imageRows) {
    if (!imageByProduct.has(productId)) {
      imageByProduct.set(productId, storageKey.split('/').pop())
    }
  }

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Master Product List')

  // Freeze columns A-B and row 1 (matches the original view settings)
  ws.views = [{
    state: 'frozen',
    xSplit: 2,
    ySplit: 1,
    topLeftCell: 'C2',
    activeCell: 'A1',
  }]

  // Column widths
  COL_WIDTHS.forEach((width, i) => { ws.getColumn(i + 1).width = width })

  // Header row with full original styling
  const hdrRow = ws.addRow(HEADERS)
  hdrRow.height = 45.75
  hdrRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.fill      = colNum === HEADERS.length ? HDR_FILL_OTHER : HDR_FILL_DEFAULT
    cell.font      = { ...HDR_FONT, ...(colNum === HEADERS.length ? { color: { argb: 'FF000000' } } : {}) }
    cell.alignment = HDR_ALIGNMENT
    cell.border    = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } },
    }
  })

  const UOM_COL  = HEADERS.indexOf('uom\n (Lft, Ea, SqFt, Kit, Pc)') + 1
  const FLEX_COL = HEADERS.indexOf('Flex') + 1

  // Data rows
  for (const p of rows) {
    const subs = subsByProduct.get(p.id) ?? []
    const sp   = speciesByProduct.get(p.id) ?? new Map()
    const row = ws.addRow([
      imageByProduct.get(p.id) ?? '',
      p.productCode ?? '',
      p.name ?? '',
      p.categoryName ?? '',
      subs.join('|'),
      p.sizeDisplay ?? '',
      p.description ?? '',
      tick(p.availability),
      p.price ?? '',
      p.uom ?? '',
      ...SPECIES_BEFORE_FLEX.map((s) => tick(sp.get(s))),
      tick(p.flexAvailability),
      ...SPECIES_AFTER_FLEX.map((s) => tick(sp.get(s))),
      '',
    ])
    row.getCell(UOM_COL).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Lft,Ea,SqFt,Kit,Pc"'],
      showDropDown: false,
    }
    row.getCell(FLEX_COL).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"S,QS,MO"'],
      showDropDown: false,
    }
  }

  // Autofilter on the header row
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: rows.length + 1, column: HEADERS.length },
  }

  const buf = await wb.xlsx.writeBuffer()
  const now  = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="RoyalWoodShop_Master_${date}.xlsx"`,
    },
  })
}
