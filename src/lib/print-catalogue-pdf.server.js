import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadImage } from './pdf-images.server.js'
import { normalizeStoredStyle, normalizeStyle } from './catalogue-style.js'
import { PAGE_H, PAGE_W, LABEL_H, breakPages, contentWidth, insetOf, priceLines, specRows } from './catalogue-layout.js'

/*
 * The printed catalogue as a PDF. It follows the admin preview: the same cover,
 * the same page breaks (from catalogue-layout.js), and the saved style: the catalogue style,
 * with any custom pages drawn in their own style.
 *
 * PDFs use the built-in fonts, so the style's font choices map to the nearest
 * built-in family: serif, sans or mono.
 */

const FAMILY = { georgia: 'serif', garamond: 'serif', times: 'serif', helvetica: 'sans', verdana: 'sans', courier: 'mono', site: 'sans' }
const FACES = {
  serif: { regular: 'Times-Roman', bold: 'Times-Bold' },
  sans: { regular: 'Helvetica', bold: 'Helvetica-Bold' },
  mono: { regular: 'Courier', bold: 'Courier-Bold' },
}
const face = (fontKey, bold = false) => FACES[FAMILY[fontKey] ?? 'sans'][bold ? 'bold' : 'regular']
const CODE_FONT = FACES.mono.regular
const MUTED_LABEL = '#9ca3af'
const COVER_DATE_COLOR = '#555555'
const PRICE_STRIKE = '#9ca3af'

const LOGO_SVG = fileURLToPath(new URL('../assets/images/logo-blue.svg', import.meta.url))
let logoPromise = null
/** The blue logo as a PNG. PDFs cannot embed SVG, so it is rasterised once and kept. */
function loadLogo() {
  if (!logoPromise) {
    logoPromise = readFile(LOGO_SVG)
      .then((svg) => sharp(svg).resize({ width: 520 }).png().toBuffer())
      .catch(() => null)
  }
  return logoPromise
}

const dateText = () => new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

/** Draws (when `draw` is true) or measures one block of text. Returns its height including the top margin. */
function text(doc, draw, str, x, y, { fontName, size, color, width, lineGap = 0, marginTop = 0, align, characterSpacing }) {
  if (str == null || str === '') return 0
  const top = y + marginTop
  doc.font(fontName).fontSize(size)
  const h = doc.heightOfString(String(str), { width, lineGap, characterSpacing })
  if (draw) doc.fillColor(color).text(String(str), x, top, { width, lineGap, align, characterSpacing, lineBreak: true })
  return marginTop + h
}

/**
 * Lays out one product from (x, y), inside its row padding: the shaded row behind it, the picture
 * box, then the text column, as the preview does. With draw false it only measures.
 * Returns the height the row takes, padding included.
 */
function layoutItem(doc, item, x, y, st, showPrices, draw, images) {
  const pad = st.rowPadding
  const height = drawContent(doc, item, x + pad, y + pad, st, showPrices, false, images) + pad * 2
  if (!draw) return height
  if (st.rowShade) doc.save().fillColor(st.rowShade).rect(x, y, contentWidth(st), height).fill().restore()
  drawContent(doc, item, x + pad, y + pad, st, showPrices, true, images)
  return height
}

/** The product's picture and text, from (x, y). Returns the height of the content, without the row padding. */
function drawContent(doc, item, x, y, st, showPrices, draw, images) {
  const top = st.imagePosition === 'top'
  const box = st.imageSize
  const innerW = contentWidth(st) - st.rowPadding * 2
  const textW = top ? innerW : innerW - box - st.spacing
  const tx = top ? x : x + box + st.spacing
  const heading = face(st.headingFont, true)
  const body = face(st.bodyFont)
  const bodyBold = face(st.bodyFont, true)

  // Picture
  const pic = item.image ? images.get(item.image) : null
  // The picture box only takes height when the product has a picture.
  const picH = item.image ? box : 0
  if (draw && pic) doc.image(pic, x, y, { fit: [box, box], align: 'center', valign: 'center' })

  // Text column, from below the picture when the picture is on top
  const ty = top ? y + picH + (picH ? st.spacing : 0) : y
  let th = 0
  th += text(doc, draw, item.name, tx, ty + th, { fontName: heading, size: st.nameSize, color: st.titleColor, width: textW, lineGap: st.nameSize * 0.2 })
  th += text(doc, draw, item.productCode, tx, ty + th, { fontName: CODE_FONT, size: 9, color: st.codeColor, width: textW, marginTop: 2 })
  th += text(doc, draw, item.description, tx, ty + th, { fontName: body, size: st.bodySize, color: st.textColor, width: textW, lineGap: st.bodySize * 0.4, marginTop: 6 })

  // Specification rows: label in a fixed column, value beside it
  const specs = specRows(item)
  if (specs.length) {
    const labelW = 84
    const valueX = tx + labelW + 8
    const valueW = textW - labelW - 8
    const size = st.bodySize - 0.5
    specs.forEach(([label, value], i) => {
      const rowY = ty + th + (i ? 2 : 0)
      const hL = text(doc, draw, label, tx, rowY, { fontName: bodyBold, size, color: st.labelColor, width: labelW })
      const hV = text(doc, draw, value, valueX, rowY, { fontName: body, size, color: st.textColor, width: valueW })
      th += (i ? 2 : 0) + Math.max(hL, hV)
    })
  }

  // Prices, one line per species (or the single product price)
  const prices = showPrices ? priceLines(item) : []
  if (prices.length) {
    const size = st.bodySize + 0.5
    th += 6
    prices.forEach((p) => {
      const lineY = ty + th
      let px = tx
      doc.font(body).fontSize(size)
      const lineH = doc.heightOfString('Ag', { width: textW })
      if (draw) {
        if (p.label) {
          doc.font(body).fontSize(size).fillColor(st.labelColor).text(p.label, px, lineY, { lineBreak: false })
          px += doc.widthOfString(p.label) + 8
        }
        if (p.sale) {
          doc.font(body).fontSize(size).fillColor(PRICE_STRIKE)
          const w = doc.widthOfString(p.price)
          doc.text(p.price, px, lineY, { lineBreak: false })
          doc.moveTo(px, lineY + lineH / 2).lineTo(px + w, lineY + lineH / 2).lineWidth(0.5).strokeColor(PRICE_STRIKE).stroke()
          px += w + 6
          doc.font(bodyBold).fontSize(size).fillColor(st.textColor).text(p.sale, px, lineY, { lineBreak: false })
        } else {
          doc.font(bodyBold).fontSize(size).fillColor(st.textColor).text(p.price, px, lineY, { lineBreak: false })
        }
      }
      th += lineH
    })
  }

  return top ? picH + (picH ? st.spacing : 0) + th : Math.max(picH, th)
}

/** The solid frame round a page, at the margins. */
function drawFrame(doc, st) {
  const m = st.pageMargin
  doc.rect(m, m, PAGE_W - m * 2, PAGE_H - m * 2).lineWidth(1).strokeColor(st.ruleColor).stroke()
}

/** The cover, as the preview draws it: background, logo, title in a light box when there is a background, and the date. */
function drawCover(doc, cat, st, background, logo) {
  if (background) doc.image(background, 0, 0, { cover: [PAGE_W, PAGE_H], align: 'center', valign: 'center' })

  const title = cat.title
  const m = st.pageMargin
  const titleW = PAGE_W - m * 2
  doc.font(face(st.headingFont, true)).fontSize(st.coverTitleSize)
  const titleH = doc.heightOfString(title, { width: titleW, align: 'center' })
  const logoW = 130
  const logoImg = logo ? doc.openImage(logo) : null
  const logoH = logoImg ? logoImg.height * (logoW / logoImg.width) : 0
  const blockH = logoH + 28 + titleH
  const top = (PAGE_H - blockH) / 2

  if (background) {
    const boxW = Math.min(titleW, Math.max(logoW, doc.widthOfString(title)) + 56)
    doc.save().fillOpacity(0.9).rect((PAGE_W - boxW) / 2, top - 24, boxW, blockH + 48).fill('#ffffff').restore()
  }
  if (logo) doc.image(logo, (PAGE_W - logoW) / 2, top, { width: logoW })
  text(doc, true, title, m, top + logoH + 28, { fontName: face(st.headingFont, true), size: st.coverTitleSize, color: st.coverTitleColor, width: titleW, align: 'center' })

  text(doc, true, cat.coverDate || dateText(), m, PAGE_H - m - 12, { fontName: face('site'), size: 10, color: COVER_DATE_COLOR, width: titleW, align: 'center' })
}

/** One product page: optional label, then the products with optional rules between them. */
function drawProductPage(doc, items, pageNo, st, showPrices, images) {
  // Content starts inside the margin and, on a framed page, inside the frame's padding.
  const m = st.pageMargin + insetOf(st)
  let y = m
  if (st.pageLabel) {
    text(doc, true, `PAGE ${pageNo}`, m, y, { fontName: face('site'), size: 8, color: MUTED_LABEL, width: contentWidth(st), characterSpacing: 1 })
    y += LABEL_H
  }
  items.forEach((item, i) => {
    if (i > 0) {
      y += st.spacing
      if (st.rules) {
        doc.moveTo(m, y).lineTo(m + contentWidth(st), y).lineWidth(st.ruleWeight).strokeColor(st.ruleColor).stroke()
        y += st.ruleWeight + st.spacing / 2
      }
    }
    y += layoutItem(doc, item, m, y, st, showPrices, true, images)
  })
}

/** Renders a catalogue (as returned by getPrintCatalogue) to a PDF Buffer. */
export async function renderCataloguePdf(cat) {
  const stored = normalizeStoredStyle(cat.style)
  const globalSt = normalizeStyle(stored)
  const overrides = stored.pageStyles
  const showPrices = Boolean(cat.showPrices)
  const order = cat.items

  // Pictures are loaded once, at the size they are printed, and shared between measuring and drawing.
  const urls = [...new Set(order.map((i) => i.image).filter(Boolean))]
  const images = new Map(await Promise.all(urls.map(async (u) => [u, await loadImage(u, { width: 600, jpeg: true })])))
  const background = cat.coverImageKey ? await loadImage(cat.coverImageKey, { width: 1400, jpeg: true }) : null
  const logo = await loadLogo()

  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 0,
    info: { Title: cat.title, Author: 'The Royal Wood Shop' },
  })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((ok) => doc.on('end', ok))

  // Break pages exactly as the preview does: each product is measured in the style of the page it lands on.
  const measured = new Map()
  const heightAt = (i, s) => {
    const key = `${i}:${JSON.stringify(s)}`
    if (!measured.has(key)) measured.set(key, layoutItem(doc, order[i], 0, 0, s, showPrices, false, images))
    return measured.get(key)
  }
  const pages = breakPages(order.length, globalSt, (i) => overrides[String(order[i].itemId)] ?? null, heightAt)

  // Page 1: the cover (the document starts with one page already). Its frame goes over the background.
  drawCover(doc, cat, globalSt, background, logo)
  if (globalSt.pageBorder) drawFrame(doc, globalSt)

  // Then the product pages, each in its own style
  pages.forEach((page, p) => {
    doc.addPage({ size: 'LETTER', margin: 0 })
    if (page.style.pageBorder) drawFrame(doc, page.style)
    drawProductPage(doc, page.items.map((i) => order[i]), p + 1, page.style, showPrices, images)
  })

  doc.end()
  await done
  return Buffer.concat(chunks)
}
