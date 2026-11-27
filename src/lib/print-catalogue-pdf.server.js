import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import logoSvg from '../assets/images/logo-blue.svg?raw'
import { loadImage } from './pdf-images.server.js'
import { normalizeStoredStyle, normalizeStyle } from './catalogue-style.js'
import { PAGE_H, PAGE_W, LABEL_H, breakPages, buildBlocks, contentWidth, insetOf, pictureSize, priceLines, specRows } from './catalogue-layout.js'

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

let logoPromise = null
/**
 * The blue logo as a PNG. PDFs cannot embed SVG, so it is rasterised once and kept.
 * The SVG is imported as text, so the build includes it: a file read from disk
 * is not in the deployed server bundle.
 */
function loadLogo() {
  if (!logoPromise) {
    logoPromise = sharp(Buffer.from(logoSvg)).resize({ width: 520 }).png().toBuffer().catch(() => null)
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
  // Beside its text, a picture is drawn no taller than the text when the text is shorter.
  let shownH
  if (item.image && st.imagePosition !== 'top') {
    const textH = drawContent(doc, item, x + pad, y + pad, st, showPrices, false, images, 0)
    shownH = Math.min(pictureSize(item, st.imageSize).h, textH)
  }
  const height = drawContent(doc, item, x + pad, y + pad, st, showPrices, false, images, shownH) + pad * 2
  if (!draw) return height
  if (st.rowShade) doc.save().fillColor(st.rowShade).rect(x, y, contentWidth(st), height).fill().restore()
  drawContent(doc, item, x + pad, y + pad, st, showPrices, true, images, shownH)
  return height
}

/** The product's picture and text, from (x, y). Returns the height of the content, without the row padding. */
function drawContent(doc, item, x, y, st, showPrices, draw, images, shownH) {
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
  const dims = pictureSize(item, box)
  const shown = shownH == null ? dims.h : shownH
  const scale = dims.h ? shown / dims.h : 1
  const picH = item.image ? shown : 0
  if (draw && pic) doc.image(pic, x + (box - dims.w * scale) / 2, y, { width: dims.w * scale, height: shown })

  // Text column, from below the picture when the picture is on top
  const ty = top ? y + picH + (picH ? st.spacing : 0) : y
  let th = 0
  th += text(doc, draw, item.name, tx, ty + th, { fontName: heading, size: st.nameSize, color: st.titleColor, width: textW, lineGap: st.nameSize * 0.2 })
  th += text(doc, draw, item.productCode, tx, ty + th, { fontName: CODE_FONT, size: 9, color: st.codeColor, width: textW, marginTop: 2 })
  if (st.showDescriptions) th += text(doc, draw, item.description, tx, ty + th, { fontName: body, size: st.bodySize, color: st.textColor, width: textW, lineGap: st.bodySize * 0.4, marginTop: 6 })

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
  const prices = showPrices && st.showPrices ? priceLines(item) : []
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
        if (p.sale && st.showSalePrices) {
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

/** A category or sub-category heading. Returns its height, with the space under it. */
function drawHeading(doc, heading, x, y, st, draw) {
  const category = heading.level === 'category'
  return text(doc, draw, heading.text, x, y, {
    fontName: category ? face(st.headingFont, true) : face(st.bodyFont, true),
    size: category ? st.nameSize + 2 : st.bodySize + 1.5,
    color: category ? st.titleColor : st.labelColor,
    width: contentWidth(st),
    lineGap: -(category ? st.nameSize + 2 : st.bodySize + 1.5) * 0.2,
  }) + st.spacing + (category ? st.nameSize + 2 : st.bodySize + 1.5) * 0.2
}

/** A product with its headings above it. Returns the height of the block. */
function layoutBlock(doc, block, x, y, st, showPrices, draw, images) {
  let h = 0
  for (const heading of block.headings) h += drawHeading(doc, heading, x, y + h, st, draw)
  return h + layoutItem(doc, block.item, x, y + h, st, showPrices, draw, images)
}

/** The cover, as the preview draws it: background, logo, title in a light box when there is a background, and the date. */
function drawCover(doc, cat, st, background, logo) {
  if (background) doc.image(background, 0, 0, { cover: [PAGE_W, PAGE_H], align: 'center', valign: 'center' })

  const title = cat.title
  const m = st.pageMargin
  const titleW = PAGE_W - m * 2
  doc.font(face(st.headingFont, true)).fontSize(st.coverTitleSize)
  const titleH = doc.heightOfString(title, { width: titleW, align: 'center' })
  const titleTextW = doc.widthOfString(title) // measured now, while the heading font is set
  const logoW = 130
  const logoImg = logo ? doc.openImage(logo) : null
  const logoH = logoImg ? logoImg.height * (logoW / logoImg.width) : 0
  // The subtitle, if any, sits under the title.
  const subSize = Math.max(12, st.coverTitleSize * 0.5)
  const subH = st.subtitle ? (doc.font(face(st.bodyFont)).fontSize(subSize), 8 + doc.heightOfString(st.subtitle, { width: titleW, align: 'center' })) : 0
  const blockH = logoH + 28 + titleH + subH
  const top = (PAGE_H - blockH) / 2

  if (background) {
    const boxW = Math.min(titleW, Math.max(logoW, titleTextW) + 56)
    doc.save().fillOpacity(0.9).rect((PAGE_W - boxW) / 2, top - 24, boxW, blockH + 48).fill('#ffffff').restore()
  }
  if (logo) doc.image(logo, (PAGE_W - logoW) / 2, top, { width: logoW })
  text(doc, true, title, m, top + logoH + 28, { fontName: face(st.headingFont, true), size: st.coverTitleSize, color: st.coverTitleColor, width: titleW, align: 'center' })
  if (st.subtitle) text(doc, true, st.subtitle, m, top + logoH + 28 + titleH, { fontName: face(st.bodyFont), size: subSize, color: st.textColor, width: titleW, align: 'center', marginTop: 8 })

  text(doc, true, cat.coverDate || dateText(), m, PAGE_H - m - 12, { fontName: face('site'), size: 10, color: COVER_DATE_COLOR, width: titleW, align: 'center' })
}

/** One product page: optional label, then the products with optional rules between them. */
function drawProductPage(doc, blocks, pageNo, st, showPrices, images) {
  // Content starts inside the margin and, on a framed page, inside the frame's padding.
  const m = st.pageMargin + insetOf(st)
  let y = m
  if (st.pageLabel) {
    text(doc, true, `PAGE ${pageNo}`, m, y, { fontName: face('site'), size: 8, color: MUTED_LABEL, width: contentWidth(st), characterSpacing: 1 })
    y += LABEL_H
  }
  blocks.forEach((block, i) => {
    if (i > 0) {
      y += st.spacing
      if (st.rules) {
        doc.moveTo(m, y).lineTo(m + contentWidth(st), y).lineWidth(st.ruleWeight).strokeColor(st.ruleColor).stroke()
        y += st.ruleWeight + st.spacing / 2
      }
    }
    y += layoutBlock(doc, block, m, y, st, showPrices, true, images)
  })
}

/** Renders a catalogue (as returned by getPrintCatalogue) to a PDF Buffer. */
export async function renderCataloguePdf(cat) {
  const stored = normalizeStoredStyle(cat.style)
  const globalSt = normalizeStyle(stored)
  const overrides = stored.pageStyles
  const showPrices = Boolean(cat.showPrices)
  const order = cat.items
  const blocks = buildBlocks(order, globalSt.sectionHeadings)

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
    if (!measured.has(key)) measured.set(key, layoutBlock(doc, blocks[i], 0, 0, s, showPrices, false, images))
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
    drawProductPage(doc, page.items.map((i) => blocks[i]), p + 1, page.style, showPrices, images)
  })

  doc.end()
  await done
  return Buffer.concat(chunks)
}
