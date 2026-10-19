import { useLayoutEffect, useRef, useState } from 'react'
import logoBlue from '../../assets/images/logo-blue.svg'
import { AVAILABILITY_LABEL } from '../../lib/catalogue-constants'

/*
 * The printed catalogue, drawn at true size and scaled to fit the pane.
 * Pages are 8.5 x 11 in at 72 points per inch, so layout here matches the PDF:
 * 0.75 in margins, each product at its real height, and pages filled in order.
 * Tap a page to list its items below. Hover the cover for Edit, which opens the cover in the pane.
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
  const pages = []
  let cur = []
  let used = 0
  heights.forEach((h, i) => {
    const add = cur.length ? GAP + h : h
    if (cur.length && used + add > CONTENT_H) {
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

/** The cover, as printed: optional background, logo centred, title, and the date at the bottom. */
function CoverContent({ title, date, background }) {
  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      {background && (
        <img src={background} alt="" style={{ position: 'absolute', left: -MARGIN, top: -MARGIN, width: PAGE_W, height: PAGE_H, objectFit: 'cover' }} />
      )}
      <div style={{ position: 'relative', background: background ? 'rgba(255,255,255,0.9)' : 'transparent', padding: background ? '24px 28px' : 0 }}>
        <img src={logoBlue} alt="" style={{ width: 130, display: 'block', margin: '0 auto' }} />
        <div style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 30, color: '#111', marginTop: 28 }}>{title}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 10, color: '#555' }}>{date || dateText()}</div>
    </div>
  )
}

/** One printed page at true size, scaled down to `scale`. The dashed frame is the margin. */
function Page({ scale, selected = false, children, ...rest }) {
  return (
    <div {...rest} className="group" style={{ position: 'relative', width: PAGE_W * scale, height: PAGE_H * scale, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', boxSizing: 'border-box', padding: MARGIN }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN, border: '1px dashed #d1d5db', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', height: '100%' }}>{children}</div>
      </div>
      {/* Selection frame, drawn on top of the page */}
      {selected && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, border: '3px solid #2563eb', boxSizing: 'border-box', zIndex: 20, pointerEvents: 'none' }} />}
      {/* Light outline on hover, so it is clear the page can be tapped */}
      {!selected && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 border-2 border-transparent transition-colors group-hover:border-blue-300" />}
    </div>
  )
}

export default function CataloguePreview({ title, coverDate, coverImage, coverOptions, order, showPrices, itemProps, removeForm }) {
  const measureRefs = useRef([])
  const boxRef = useRef(null)
  const [heights, setHeights] = useState([])
  const [boxW, setBoxW] = useState(0)
  // The page tapped in the spread, whose items are listed below. Null until one is tapped.
  const [selected, setSelected] = useState(null)
  // The cover, opened from its Edit button: it takes over the pane.
  const [coverOpen, setCoverOpen] = useState(false)

  // Track the pane's width so the pages scale to fit.
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
  const coverScale = boxW ? (boxW - 16) / PAGE_W : 0.5
  const pages = paginate(order.map((_, i) => heights[i] ?? 0))
  const cellW = PAGE_W * scale
  const cellH = PAGE_H * scale
  const chosen = selected != null && selected < pages.length ? selected : null

  return (
    <div>
      <div ref={boxRef} className="relative rounded-lg bg-gray-100 p-2">
        {/* Hidden copy at true width, used only to measure products */}
        <div aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0, width: CONTENT_W, visibility: 'hidden' }}>
          {order.map((item, i) => (
            <div key={item.itemId} style={{ paddingBottom: GAP }}>
              <ProductRow item={item} showPrices={showPrices} rowRef={(el) => { measureRefs.current[i] = el }} />
            </div>
          ))}
        </div>

        {coverOpen ? (
          // The cover takes over the pane at full width
          <div className="mx-auto" style={{ width: PAGE_W * coverScale }}>
            <Page scale={coverScale}>
              <CoverContent title={title} date={coverDate} background={coverImage} />
            </Page>
          </div>
        ) : (
          <div className="relative mx-auto grid grid-cols-2 gap-y-4" style={{ width: cellW * 2 }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-gray-200" />

            {/* Cover, with Edit on hover, and an empty slot beside it */}
            <div className="group relative" style={{ width: cellW, height: cellH }}>
              <Page scale={scale} onClick={() => setCoverOpen(true)}>
                <CoverContent title={title} date={coverDate} background={coverImage} />
              </Page>
              <button type="button" onClick={() => setCoverOpen(true)}
                className="absolute right-2 top-2 z-30 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 opacity-0 shadow transition-opacity hover:border-royal-blue group-focus-within:opacity-100 group-hover:opacity-100">
                Edit
              </button>
            </div>
            <div style={{ width: cellW, height: cellH }} />

            {/* Product pages, two across, exactly as printed; tap a page to list its items below */}
            {pages.map((page, p) => (
              <Page key={p} scale={scale} selected={chosen === p} onClick={() => setSelected(p)}>
                <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Page {p + 1}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {page.map((i) => <ProductRow key={order[i].itemId} item={order[i]} showPrices={showPrices} />)}
                </div>
              </Page>
            ))}
          </div>
        )}
      </div>

      {coverOpen ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cover</p>
          <button type="button" onClick={() => setCoverOpen(false)} className="text-sm text-royal-blue hover:underline">Back to layout</button>
        </div>
      ) : null}

      {coverOpen && <div className="mt-4">{coverOptions}</div>}

      {/* Every product, grouped by page, so any product can be dragged to any position. The tapped page is highlighted. */}
      {!coverOpen && (
        <div className="mt-4">
          {order.length === 0 && <p className="text-xs text-gray-500">No products yet. Add some from the table on the left.</p>}
          {order.length > 0 && chosen == null && <p className="text-xs text-gray-500">Tap a page to highlight it. Drag any product to reorder.</p>}
          <div className="space-y-4">
            {pages.map((page, p) => (
              <div key={p}>
                <p className={`text-xs uppercase tracking-wide ${chosen === p ? "font-bold text-gray-900" : "font-semibold text-gray-500"}`}>Page {p + 1}: {page.length} product{page.length === 1 ? "" : "s"}</p>
                <ol className="mt-2 space-y-2">
                  {page.map((i) => {
                    const item = order[i]
                    return (
                      <li key={item.itemId} {...itemProps(item)}
                        className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm data-[dragging=true]:opacity-50">
                        <svg aria-hidden="true" width="12" height="16" viewBox="0 0 12 16" className="shrink-0 text-gray-400" fill="currentColor">
                          <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
                          <circle cx="3" cy="8" r="1.5" /><circle cx="9" cy="8" r="1.5" />
                          <circle cx="3" cy="13" r="1.5" /><circle cx="9" cy="13" r="1.5" />
                        </svg>
                        <span className="min-w-0 flex-1">
                          {item.name}
                          {item.productCode && <span className="ml-2 font-mono text-xs text-gray-500">{item.productCode}</span>}
                          {item.status === "archived" && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Archived: not printed</span>
                          )}
                        </span>
                        {removeForm && <span className="shrink-0">{removeForm(item)}</span>}
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
