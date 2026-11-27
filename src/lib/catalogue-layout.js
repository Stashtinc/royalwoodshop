/*
 * Layout rules for the printed catalogue, shared by the admin preview and the PDF,
 * so both break pages in the same places. Pure: no imports from the DOM or the server.
 */
import { AVAILABILITY_LABEL } from './catalogue-constants.js'

export const PAGE_W = 612 // 8.5 in at 72 points per inch
export const PAGE_H = 792 // 11 in
/** Height of the "PAGE N" line at the top of a product page, when it is shown. */
export const LABEL_H = 22

const money = (v) => (v == null || v === '' ? null : `$${Number(v).toFixed(2)}`)

/** Price lines for a product: each species if it has Part ID prices, else the product price. */
export function priceLines(item) {
  if (item.prices?.length) {
    return item.prices.map((p) => ({ label: p.species, price: money(p.price), sale: money(p.salePrice) }))
  }
  if (item.price != null) return [{ label: null, price: money(item.price), sale: money(item.salePrice) }]
  return []
}

/** Label and value pairs for the spec rows, leaving out empty ones. */
export function specRows(item) {
  return [
    ['Size', item.sizeDisplay],
    ['Specifications', item.species],
    ['Category', item.category],
    ['Availability', item.availability ? (AVAILABILITY_LABEL[item.availability] ?? item.availability) : null],
    ['Lead time', item.leadTime],
  ].filter(([, v]) => v)
}

/** Space between the frame line and the content. Only a framed page has it. */
export function insetOf(st) {
  return st.pageBorder ? st.framePadding : 0
}

/** Width of the content area: inside the margins, and inside the frame when there is one. */
export function contentWidth(st) {
  return PAGE_W - (st.pageMargin + insetOf(st)) * 2
}

/** Height of the content area, less the label line when it is shown. */
export function contentHeight(st) {
  return PAGE_H - (st.pageMargin + insetOf(st)) * 2 - (st.pageLabel ? LABEL_H : 0)
}

/** Room a rule between two products takes: half the spacing above it, plus its weight. */
export function ruleCost(st) {
  return st.rules ? st.spacing / 2 + st.ruleWeight : 0
}

/**
 * Breaks products into pages. Each page takes the style of its first product: its own
 * style if that product starts a custom page, otherwise the catalogue style. A custom page
 * always starts a new page.
 *
 *   count      number of products, in print order
 *   globalSt   the catalogue style
 *   overrideAt(i)  the custom style of product i, or null
 *   heightAt(i, st) the height product i takes in style st
 *
 * Returns [{ items: [indexes], style }].
 */
/**
 * One block per product: the category and sub-category headings that start at it (when they change),
 * then the product. Pages break between blocks, so a heading always sits with the product it introduces.
 */
export function buildBlocks(items, showHeadings) {
  let prevCat = null
  let prevSub = null
  return items.map((item) => {
    const cat = item.category || ''
    const sub = item.subcategory || ''
    const headings = []
    if (showHeadings) {
      if (cat && cat !== prevCat) headings.push({ level: 'category', text: cat })
      if (sub && (cat !== prevCat || sub !== prevSub)) headings.push({ level: 'subcategory', text: sub })
    }
    prevCat = cat
    prevSub = sub
    return { item, headings }
  })
}

export function breakPages(count, globalSt, overrideAt, heightAt) {
  const pages = []
  let i = 0
  while (i < count) {
    const st = overrideAt(i) ?? globalSt
    const limit = contentHeight(st)
    const items = [i]
    let used = heightAt(i, st)
    let j = i + 1
    while (j < count && !overrideAt(j)) {
      const add = st.spacing + ruleCost(st) + heightAt(j, st)
      if (used + add > limit) break
      used += add
      items.push(j)
      j++
    }
    pages.push({ items, style: st })
    i = j
  }
  return pages
}
