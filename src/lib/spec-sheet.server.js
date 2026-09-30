import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { speciesSummary, subsOf } from '../data/catalogue'

/**
 * One-page product specification sheet as a real PDF.
 *
 * Mirrors the print-only SpecSheet in ProductDetail.jsx, so Download, Print and
 * the browser's own Ctrl+P all give the customer the same page.
 */

const INK = '#000000'
const MUTED = '#555555'
const RULE = '#9ca3af'
const HAIRLINE = '#e5e7eb'
const MARGIN = 54 // 0.75in

const UPLOAD_DIRS = [process.env.UPLOAD_DIR, 'public/uploads'].filter(Boolean)

/**
 * Product images are WebP, which PDFs cannot embed, so each one is converted
 * to PNG (profile drawings rely on transparency). Uploads are read straight
 * from disk, from the same places server.mjs serves /uploads from.
 */
async function loadImage(url) {
  if (!url) return null
  try {
    let buf = null
    if (url.startsWith('/uploads/')) {
      const name = url.slice('/uploads/'.length)
      for (const dir of UPLOAD_DIRS) {
        buf = await readFile(resolve(dir, name)).catch(() => null)
        if (buf) break
      }
    } else if (/^https?:\/\//.test(url)) {
      const res = await fetch(url)
      if (res.ok) buf = Buffer.from(await res.arrayBuffer())
    }
    if (!buf) return null
    return await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).flatten({ background: '#ffffff' }).png().toBuffer()
  } catch {
    // A missing or unreadable picture should not cost the customer the sheet.
    return null
  }
}

export async function renderSpecSheet(product) {
  const rows = [
    ['Product code', product.productCode],
    ['Size', product.size],
    ['Species', product.species?.length ? speciesSummary(product) : null],
    ['Category', product.category],
    ['Type', subsOf(product).join(', ')],
    ['Availability', product.availabilityLabel],
    ['Lead time', product.leadTime],
  ].filter(([, v]) => v)

  const urls = [product.images?.[0]?.url ?? product.image, product.images?.[1]?.url].filter(Boolean)
  const images = (await Promise.all(urls.map(loadImage))).filter(Boolean)

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGIN,
    info: {
      Title: `${product.name}${product.productCode ? ` (${product.productCode})` : ''} – Specification Sheet`,
      Author: 'The Royal Wood Shop',
    },
  })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((ok) => doc.on('end', ok))

  const left = MARGIN
  const width = doc.page.width - MARGIN * 2

  // Letterhead
  doc.font('Times-Bold').fontSize(18).fillColor(INK).text('The Royal Wood Shop', left, MARGIN)
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('Product specification sheet')
  doc.text('Since 1982 · royalwoodshop.com', left, MARGIN + 6, { width, align: 'right' })
  let y = MARGIN + 38
  doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.75).strokeColor(RULE).stroke()

  // Title
  doc.font('Times-Bold').fontSize(22).fillColor(INK).text(product.name, left, y + 16, { width })
  if (product.productCode) {
    doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(product.productCode, { width, characterSpacing: 0.4 })
  }
  y = doc.y + 14

  // Pictures: one centred, or two side by side
  const imgHeight = 212 // ~75mm, as on the printed page
  if (images.length) {
    const gap = 16
    const cellW = images.length === 2 ? (width - gap) / 2 : width
    images.forEach((img, i) => {
      doc.image(img, left + i * (cellW + gap), y, { fit: [cellW, imgHeight], align: 'center', valign: 'center' })
    })
    y += imgHeight + 16
  }

  // Specifications
  const labelW = width * 0.38
  for (const [label, value] of rows) {
    const h = Math.max(
      doc.font('Helvetica-Bold').fontSize(9).heightOfString(label, { width: labelW - 8 }),
      doc.font('Helvetica').fontSize(9).heightOfString(String(value), { width: width - labelW }),
    )
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151').text(label, left, y + 5, { width: labelW - 8 })
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(String(value), left + labelW, y + 5, { width: width - labelW })
    y += h + 10
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(HAIRLINE).stroke()
  }

  if (product.description) {
    doc.font('Helvetica').fontSize(9).fillColor('#1f2937')
      .text(product.description, left, y + 12, { width, lineGap: 2 })
  }

  // Footer, pinned to the bottom of the page
  const footY = doc.page.height - MARGIN - 30
  doc.moveTo(left, footY).lineTo(left + width, footY).lineWidth(0.75).strokeColor(RULE).stroke()
  doc.font('Helvetica').fontSize(8).fillColor('#374151')
    .text('18237 Woodbine Ave, East Gwillimbury, ON L0G 1V0 · 905-727-1387 · info@royalwoodshop.com', left, footY + 8, { width, lineBreak: false })
  doc.fillColor('#6b7280')
    .text(`royalwoodshop.com/products/${product.categorySlug}/${product.slug} · Sizes and availability subject to change; confirm at time of order.`, left, footY + 19, { width, lineBreak: false, ellipsis: true })

  doc.end()
  await done
  return Buffer.concat(chunks)
}
