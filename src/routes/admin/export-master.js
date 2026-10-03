import { requireUser } from '../../lib/auth.server'
import { getDb } from '../../lib/db.server.js'
import { SKU_SHEET, SKU_HEADERS, skuRows } from '../../lib/sku-master.server.js'

/**
 * The Master Product List, one row per SKU (see lib/sku-master.server.js).
 * Importing it back through Admin → Import round-trips every column.
 */

const COL_WIDTHS = [24, 18, 22, 34, 19, 18, 16, 58, 18, 11, 9, 8]
const AVAIL_COL = SKU_HEADERS.indexOf('Availability') + 1
const UOM_COL = SKU_HEADERS.indexOf('UOM') + 1

const HDR_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const HDR_FONT = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Arial' }
const HDR_ALIGNMENT = { horizontal: 'center', vertical: 'bottom', wrapText: true }
const THIN = { style: 'thin', color: { argb: 'FF000000' } }

export async function loader({ request }) {
  await requireUser(request)

  const rows = await skuRows(await getDb())
  if (!rows.length) return new Response('No products found.', { status: 404 })

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(SKU_SHEET)

  // Part ID and Base Code stay in view while scrolling across.
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1, topLeftCell: 'C2', activeCell: 'A1' }]
  COL_WIDTHS.forEach((width, i) => { ws.getColumn(i + 1).width = width })

  const hdr = ws.addRow(SKU_HEADERS)
  hdr.height = 30
  hdr.eachCell((cell) => {
    cell.fill = HDR_FILL
    cell.font = HDR_FONT
    cell.alignment = HDR_ALIGNMENT
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN }
  })

  for (const values of rows) {
    const row = ws.addRow(values)
    row.getCell(AVAIL_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"S,QS,MO"'], showDropDown: false,
    }
    row.getCell(UOM_COL).dataValidation = {
      type: 'list', allowBlank: true, formulae: ['"Lft,Ea,SqFt,Kit,Pc"'], showDropDown: false,
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: SKU_HEADERS.length } }

  const buf = await wb.xlsx.writeBuffer()
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="RoyalWoodShop_Master_${date}.xlsx"`,
    },
  })
}
