import { useLayoutEffect, useRef, useState } from 'react'
import logoBlue from '../../assets/images/logo-blue.svg'
import { AVAILABILITY_LABEL } from '../../lib/catalogue-constants'

/*
 * The printed catalogue, drawn at true size and scaled to fit the pane.
 * Pages are 8.5 x 11 in at 72 points per inch, so layout here matches the PDF:
 * 0.75 in margins, each product at its real height, and pages filled in order.
 */
export const PAGE_W = 612
export const PAGE_H = 792
const MARGIN = 54 // 0.75 in
const GAP = 14 // space between products
const HEAD = 22 // the "Page N" line
const IMG = 150 // picture box, square
const CONTENT_W = PAGE_W - MARGIN * 2
const CONTENT_H = PAGE_H - MARGIN * 2 - HEAD

const money = (v) => (v == null || v === '' ? null : `$${Number(v).toFixed(2)}`)

/** Price lines for a product: each species if it has Part ID prices, else the product price. */
export function priceLines(item) {
  if (item.prices?.length) {
    return item.prices.map((p) => ({ label: p.species, price: money(p.price), sale: money(p.salePrice) }))
  }
  if (item.price != null) return [{ label: null, price: money(item.price), sale: money(item.salePrice) }]
  return []
}

function specRows(item) {
  return [
    ['Size', item.sizeDisplay],
    ['Specifications', item.species],
    ['Category', item.category],
    ['Availability', item.availability ? (AVAILABILITY_LABEL[item.availability] ?? item.availability) : null],
    ['Lead time', item.leadTime],
  ].filter(([, v]) => v)
}

const dateText = () => new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

/** Packs products onto pages by their measured heights, in order. Returns arrays of indexes. */
function paginate(heights) {
  const avail = CONTENT_H
  const pages = []
  let cur = []
  let used = 0
  heights.forEach((h, i) => {
    const add = cur.length ? GAP + h : h
    if (cur.length && used + add > avail) {
      pages.push(cur)
      cur = []
      used = 0
    }
    used += cur.length ? GAP + h : h
    cur.push(i)
  })
  if (cur.length) pages.push(cur)
  return pages
}

/** Overview of a product on a page: picture and name only. Details show when the page is opened. */
function CompactRow({ item }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.image && <img src={item.image} alt="" style={{ maxWidth: 56, maxHeight: 56, objectFit: 'contain' }} />}
      </div>
      <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 13, color: '#111' }}>{item.name}</div>
    </div>
  )
}

function ProductRow({ item, showPrices, rowRef }) {
  const specs = specRows(item)
  const prices = showPrices ? priceLines(item) : []
  return (
    <div ref={rowRef} style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
      <div style={{ width: IMG, height: IMG, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.image && <img src={item.image} alt="" style={{ maxWidth: IMG, maxHeight: IMG, objectFit: 'contain' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, lineHeight: 1.2, color: '#111' }}>{item.name}</div>
        {item.productCode && (
          <div style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 9, color: '#555', marginTop: 2 }}>{item.productCode}</div>
        )}
        {item.description && (
          <div style={{ fontSize: 9.5, lineHeight: 1.4, color: '#1f2937', marginTop: 6 }}>{item.description}</div>
        )}
        {specs.length > 0 && (
          <dl style={{ display: 'grid', gridTemplateColumns: '84px 1fr', rowGap: 2, columnGap: 8, fontSize: 9, marginTop: 6 }}>
            {specs.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ fontWeight: 700, color: '#374151' }}>{label}</dt>
                <dd style={{ margin: 0, color: '#000' }}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {prices.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: 10 }}>
            {prices.map((p, i) => (
              <li key={i} style={{ color: '#000' }}>
                {p.label && <span style={{ marginRight: 8, color: '#374151' }}>{p.label}</span>}
                {p.sale ? (
                  <>
                    <span style={{ marginRight: 6, color: '#9ca3af', textDecoration: 'line-through' }}>{p.price}</span>
                    <span style={{ fontWeight: 700 }}>{p.sale}</span>
                  </>
                ) : <span style={{ fontWeight: 700 }}>{p.price}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** One printed page at true size, scaled down to `scale`. The dashed frame is the margin. */
function Page({ scale, children, ...rest }) {
  return (
    <div {...rest} style={{ position: 'relative', width: PAGE_W * scale, height: PAGE_H * scale, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', boxSizing: 'border-box', padding: MARGIN, boxShadow: 'none' }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN, border: '1px dashed #d1d5db', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', height: '100%' }}>{children}</div>
      </div>
    </div>
  )
}

export default function CataloguePreview({ title, order, showPrices, itemProps }) {
  const measureRefs = useRef([])
  const boxRef = useRef(null)
  const [heights, setHeights] = useState([])
  const [boxW, setBoxW] = useState(0)
  // The page whose details are open (one at a time), or null.
  const [openPage, setOpenPage] = useState(null)

  // Track the pane's width so the pages scale to fit two across.
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setBoxW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measure every product at its true width; these heights decide the page breaks.
  useLayoutEffect(() => {
    setHeights(order.map((_, i) => measureRefs.current[i]?.offsetHeight ?? 0))
  }, [order, showPrices, title])

  const scale = boxW ? Math.min(0.6, (boxW - 16) / 2 / PAGE_W) : 0.3
  const pages = paginate(order.map((_, i) => heights[i] ?? 0))
  const cellW = PAGE_W * scale
  const cellH = PAGE_H * scale

  return (
    <div ref={boxRef} className="relative rounded-lg bg-gray-100 p-2">
      {/* Hidden copy at true width, used only to measure products */}
      <div aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0, width: CONTENT_W, visibility: 'hidden' }}>
        {order.map((item, i) => (
          <div key={item.itemId} style={{ paddingBottom: GAP }}>
            <ProductRow item={item} showPrices={showPrices} rowRef={(el) => { measureRefs.current[i] = el }} />
          </div>
        ))}
      </div>

      <div className="relative mx-auto grid grid-cols-2 gap-y-4" style={{ width: cellW * 2 }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-gray-200" />

        {/* Cover, with an empty slot beside it */}
        <Page scale={scale}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
            <img src={logoBlue} alt="" style={{ width: 130 }} />
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 30, color: '#111', marginTop: 28 }}>{title}</div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 10, color: '#555' }}>{dateText()}</div>
          </div>
        </Page>
        <div style={{ width: cellW, height: cellH }} />

        {/* Product pages, two across */}
        {pages.map((page, p) => (
          <Page key={p} scale={scale} onClick={() => setOpenPage(openPage === p ? null : p)}>
            <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Page {p + 1}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {page.map((i) => (
                <div key={order[i].itemId} {...itemProps(order[i])} style={{ cursor: 'grab' }}>
                  {openPage === p ? <ProductRow item={order[i]} showPrices={showPrices} /> : <CompactRow item={order[i]} />}
                </div>
              ))}
            </div>
          </Page>
        ))}
      </div>
    </div>
  )
}
