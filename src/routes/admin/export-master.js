import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import { SKU_SHEET, SKU_HEADERS, skuRows } from '../../lib/sku-master.server.js'
import { masterAttributeColumns } from '../../lib/attributes-admin.server.js'
import { log } from '../../lib/activity.server.js'

/**
 * The Master Product List, one row per SKU (see lib/sku-master.server.js).
 * Importing it back through Admin → Import round-trips every column.
 */

const COL_WIDTHS = [24, 18, 22, 34, 19, 18, 16, 58, 18, 11, 9, 8]
const AVAIL_COL = SKU_HEADERS.indexOf('Availability') + 1
const UOM_COL = SKU_HEADERS.indexOf('UOM') + 1
// Long descriptions wrap inside their cell, so the Specifications column beside them stays readable.
const DESCRIPTION_COL = SKU_HEADERS.indexOf('Description') + 1

const HDR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const ATTR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4B183' } }
const ATTR_FONT = { bold: true, size: 9, color: { argb: 'FF3B2A00' }, name: 'Arial' }
const HDR_FONT = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Arial' }
const HDR_ALIGNMENT = { horizontal: 'center', vertical: 'bottom', wrapText: true }
const THIN = { style: 'thin', color: { argb: 'FF000000' } }

export async function loader({ request }) {
  const user = await requireUser(request)

  const rows = await skuRows(await getDb())
  if (!rows.length) return new Response('No products found.', { status: 404 })

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(SKU_SHEET)

  // Part ID and Base Code stay in view while scrolling across.
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1, topLeftCell: 'C2', activeCell: 'A1' }]
  COL_WIDTHS.forEach((width, i) => { ws.getColumn(i + 1).width = width })

  // Attribute columns (Height and any added later) are marked: a line break and "(attribute)" in the
  // header, and a different header colour. The import strips the marker to find the attribute.
  const attrHeaders = (await masterAttributeColumns()).map((c) => `${c.name}\n(attribute)`)
  const headers = [...SKU_HEADERS, ...attrHeaders]
  const hdr = ws.addRow(headers)
  hdr.height = 30
  hdr.eachCell((cell, col) => {
    const isAttr = col > SKU_HEADERS.length
    cell.fill = isAttr ? ATTR_FILL : HDR_FILL
    cell.font = isAttr ? ATTR_FONT : HDR_FONT
    cell.alignment = HDR_ALIGNMENT
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN }
  })

  for (const values of rows) {
    const row = ws.addRow(values)
    row.getCell(DESCRIPTION_COL).alignment = { wrapText: true, vertical: 'top' }
    row.getCell(AVAIL_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"S,QS,MO"'], showDropDown: false,
    }
    row.getCell(UOM_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Lft,Ea,SqFt,Kit,Pc"'], showDropDown: false,
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: headers.length } }

  // Read back on import to spot a copy that predates edits made on the website.
  const now = new Date()
  wb.subject = `Downloaded from the website ${now.toISOString()}`
  const buf = await wb.xlsx.writeBuffer()
  // The next download lists website changes from this point on.
  await log(user, 'master.downloaded', { details: { rows: rows.length } })
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="RoyalWoodShop_Master_${date}.xlsx"`,
    },
  })
}
