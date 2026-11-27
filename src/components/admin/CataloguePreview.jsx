import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import logoBlue from '../../assets/images/logo-blue.svg'
import { FONT_STACK, normalizeStoredStyle, normalizeStyle, stableJson } from '../../lib/catalogue-style'
import { PAGE_H, PAGE_W, breakPages, buildBlocks, contentWidth, insetOf, priceLines, specRows } from '../../lib/catalogue-layout'
import { AppearanceFields } from './CatalogueStyleForm'

/*
 * The printed catalogue, drawn at true size and scaled to fit the pane.
 * Pages are 8.5 x 11 in at 72 points per inch, so layout here matches the PDF.
 * The catalogue style applies to every page. A page can be set to custom, which gives it
 * its own style; a custom page always starts a new page.
 * Tap a page to list its items below. Hover a page or the cover for Edit.
 */

// Zoom steps, as multiples of the size that fits the canvas. ZOOM_FIT is the index for "fit".
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3]
const ZOOM_FIT = 2

const dateText = () => new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

const fontFor = (style, key) => (FONT_STACK[key] ? { fontFamily: FONT_STACK[key] } : {})

function ProductRow({ item, showPrices, rowRef, style, ruled = false }) {
  const specs = specRows(item)
  const prices = showPrices && style.showPrices ? priceLines(item) : []
  const top = style.imagePosition === 'top'
  // Padding and shade go around the product. A rule sits above it, in the space before the padding.
  const pad = style.rowPadding
  const rule = ruled ? { borderTop: `${style.ruleWeight}px solid ${style.ruleColor}`, paddingTop: style.spacing / 2 + pad } : {}
  return (
    <div ref={rowRef} style={{
      display: 'flex', flexDirection: top ? 'column' : 'row', gap: style.spacing, alignItems: 'flex-start',
      paddingTop: pad, paddingRight: pad, paddingBottom: pad, paddingLeft: pad,
      background: style.rowShade || undefined,
      ...rule,
    }}>
      {/* The picture box only takes height when the product has a picture; otherwise the row is as tall as its text. */}
      <div style={{ width: style.imageSize, height: item.image ? style.imageSize : 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.image && <img src={item.image} alt="" style={{ maxWidth: style.imageSize, maxHeight: style.imageSize, objectFit: 'contain' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, width: top ? '100%' : undefined }}>
        <div style={{ ...fontFor(style, style.headingFont), fontWeight: 700, fontSize: style.nameSize, lineHeight: 1.2, color: style.titleColor }}>{item.name}</div>
        {item.productCode && (
          <div style={{ fontFamily: 'Menlo, Consolas, monospace', fontSize: 9, color: style.codeColor, marginTop: 2 }}>{item.productCode}</div>
        )}
        {item.description && style.showDescriptions && (
          <div style={{ ...fontFor(style, style.bodyFont), fontSize: style.bodySize, lineHeight: 1.4, color: style.textColor, marginTop: 6 }}>{item.description}</div>
        )}
        {specs.length > 0 && (
          <dl style={{ ...fontFor(style, style.bodyFont), display: 'grid', gridTemplateColumns: '84px 1fr', rowGap: 2, columnGap: 8, fontSize: style.bodySize - 0.5, marginTop: 6 }}>
            {specs.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt style={{ fontWeight: 700, color: style.labelColor }}>{label}</dt>
                <dd style={{ margin: 0, color: style.textColor }}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {prices.length > 0 && (
          <ul style={{ ...fontFor(style, style.bodyFont), listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: style.bodySize + 0.5 }}>
            {prices.map((p, i) => (
              <li key={i} style={{ color: style.textColor }}>
                {p.label && <span style={{ marginRight: 8, color: style.labelColor }}>{p.label}</span>}
                {p.sale && style.showSalePrices ? (
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
function CoverContent({ title, date, background, style }) {
  const m = style.pageMargin
  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      {background && (
        <img src={background} alt="" style={{ position: 'absolute', left: -m, top: -m, width: PAGE_W, height: PAGE_H, objectFit: 'cover' }} />
      )}
      <div style={{ position: 'relative', background: background ? 'rgba(255,255,255,0.9)' : 'transparent', padding: background ? '24px 28px' : 0 }}>
        <img src={logoBlue} alt="" style={{ width: 130, display: 'block', margin: '0 auto' }} />
        <div style={{ ...fontFor(style, style.headingFont), fontWeight: 700, fontSize: style.coverTitleSize, color: style.coverTitleColor, marginTop: 28 }}>{title}</div>
        {style.subtitle && (
          <div style={{ ...fontFor(style, style.bodyFont), fontSize: Math.max(12, style.coverTitleSize * 0.5), color: style.textColor, marginTop: 8 }}>{style.subtitle}</div>
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, fontSize: 10, color: '#555' }}>{date || dateText()}</div>
    </div>
  )
}

/** One printed page at true size, scaled down to `scale`. The dashed frame is the margin, or a solid frame when framed. */
function Page({ scale, selected = false, framed = false, margin = 54, inset = 0, ruleColor = '#d1d5db', children, ...rest }) {
  return (
    <div {...rest} className="group" style={{ position: 'relative', width: PAGE_W * scale, height: PAGE_H * scale, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff', boxSizing: 'border-box', padding: margin }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: margin, top: margin, right: margin, bottom: margin, border: framed ? `1px solid ${ruleColor}` : '1px dashed #d1d5db', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', height: '100%', boxSizing: 'border-box', padding: inset }}>{children}</div>
      </div>
      {/* Selection frame, drawn on top of the page */}
      {selected && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, border: '3px solid #2563eb', boxSizing: 'border-box', zIndex: 20, pointerEvents: 'none' }} />}
      {/* Light outline on hover, so it is clear the page can be tapped */}
      {!selected && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 border-2 border-transparent transition-colors group-hover:border-blue-300" />}
    </div>
  )
}

/** A category or sub-category heading above the products it introduces. */
function SectionHeading({ heading, style }) {
  const category = heading.level === 'category'
  return (
    <div style={{ ...fontFor(style, category ? style.headingFont : style.bodyFont), fontWeight: 700, fontSize: category ? style.nameSize + 2 : style.bodySize + 1.5, color: category ? style.titleColor : style.labelColor, marginBottom: style.spacing }}>
      {heading.text}
    </div>
  )
}

/** One product with its headings. The rule above it, when there is one, sits above the headings. */
function BlockView({ block, showPrices, style, ruled = false, rowRef }) {
  const rule = ruled ? { borderTop: `${style.ruleWeight}px solid ${style.ruleColor}`, paddingTop: style.spacing / 2 } : {}
  return (
    <div ref={rowRef} style={rule}>
      {block.headings.map((h) => <SectionHeading key={h.level} heading={h} style={style} />)}
      <ProductRow item={block.item} showPrices={showPrices} style={style} />
    </div>
  )
}

/** The heading and products of one printed page, shared by the spread and the page editor. */
function PageBody({ p, items, showPrices, style }) {
  return (
    <>
      {style.pageLabel && (
        <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Page {p + 1}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: style.spacing }}>
        {items.map((block, i) => (
          <BlockView key={block.item.itemId} block={block} showPrices={showPrices} style={style} ruled={style.rules && i > 0} />
        ))}
      </div>
    </>
  )
}

/** A product page drawn with its own style, frame and margin. */
function PageFace({ scale, page, index, showPrices, selected = false, ...rest }) {
  const items = page.items.map((i) => page.blocks[i])
  return (
    <Page scale={scale} selected={selected} framed={page.style.pageBorder} margin={page.style.pageMargin} inset={insetOf(page.style)} ruleColor={page.style.ruleColor} {...rest}>
      <PageBody p={index} items={items} showPrices={showPrices} style={page.style} />
    </Page>
  )
}

/**
 * Large single-page view. The page stays put on the left; its options scroll on the right:
 * the page's items (reorder, remove) or its appearance. Appearance changes apply to every
 * page that uses the catalogue style. Turning off "Use the catalogue style" gives this page its own.
 * Escape closes it; the arrow keys step between pages.
 */
function PageEditor({ index, count, page, showPrices, itemProps, removeForm, styleBar, onGlobalChange, onPageChange, onGo, onClose }) {
  const [panel, setPanel] = useState('items')
  // Zoom, as steps of the fitted size. Zoomed past the canvas, it scrolls.
  const [zoomIndex, setZoomIndex] = useState(ZOOM_FIT)
  const items = page.items.map((i) => page.order[i])
  const isCustom = page.custom
  // The left column's width, so the page fits sideways as well as up and down, with gray showing either side.
  const canvasRef = useRef(null)
  const [canvasW, setCanvasW] = useState(0)
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setCanvasW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onGo(index - 1)
      if (e.key === 'ArrowRight' && index < count - 1) onGo(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, count, onGo, onClose])

  // Fit the page to the window height, so the whole page is visible without scrolling.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const fitHeight = (vh - 170) / PAGE_H
  const fitWidth = canvasW ? canvasW / PAGE_W : Infinity
  const fit = Math.max(0.3, Math.min(1.1, fitHeight, fitWidth))
  const scale = fit * ZOOM_STEPS[zoomIndex]
  const navBtn = 'rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:border-gray-400 disabled:opacity-40 disabled:hover:border-gray-300'

  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit page ${index + 1}`} onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onGo(index - 1)} disabled={index === 0} aria-label="Previous page" className={navBtn}>←</button>
            <span className="min-w-[7rem] text-center text-sm font-semibold text-gray-900">Page {index + 1} of {count}</span>
            <button type="button" onClick={() => onGo(index + 1)} disabled={index >= count - 1} aria-label="Next page" className={navBtn}>→</button>
            {isCustom && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Custom style</span>}
          </div>
          <div className="flex items-center gap-3">
            {items.some((item) => item.status === 'archived') && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Archived: not printed</span>
            )}
            <button type="button" onClick={onClose} className="rounded-md bg-royal-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-royal-blue-dark">Done</button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* The page: fixed in place while the options scroll */}
          <div className="relative flex min-h-0 shrink-0 lg:w-3/4">
            <div ref={canvasRef} className="flex min-h-0 flex-1 bg-gray-200 p-6 lg:overflow-auto">
              <div className="m-auto">
                <PageFace scale={scale} page={page} index={index} showPrices={showPrices} />
              </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 text-sm shadow">
              <button type="button" onClick={() => setZoomIndex((z) => Math.max(0, z - 1))} disabled={zoomIndex === 0}
                aria-label="Zoom out" className="h-7 w-7 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40">−</button>
              <span className="w-12 text-center font-mono text-xs text-gray-600">{Math.round(scale * 100)}%</span>
              <button type="button" onClick={() => setZoomIndex((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1}
                aria-label="Zoom in" className="h-7 w-7 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-40">+</button>
              <button type="button" onClick={() => setZoomIndex(ZOOM_FIT)} disabled={zoomIndex === ZOOM_FIT}
                className="ml-1 rounded px-2 py-1 text-xs text-royal-blue hover:bg-gray-100 disabled:opacity-40">Fit</button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5 lg:w-1/4 lg:border-l lg:border-gray-200">
            <div className="flex gap-5 border-b border-gray-200">
              {[['items', `Page ${index + 1} items`], ['style', 'Appearance']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setPanel(key)}
                  className={`-mb-px border-b-2 pb-2 text-sm font-medium ${panel === key ? 'border-royal-blue text-royal-blue' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {label}
                </button>
              ))}
            </div>

            {panel === 'style' ? (
              <div className="mt-4 flex flex-col gap-5">
                <label className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
                  <span>
                    <span className="block text-sm font-medium text-gray-800">Use the catalogue style</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {isCustom
                        ? 'This page has its own style. Turn this on to go back to the catalogue style.'
                        : 'Changes here apply to every page that uses the catalogue style.'}
                    </span>
                  </span>
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-royal-blue" checked={!isCustom}
                    onChange={(e) => onPageChange(e.target.checked ? null : page.globalCopy)} />
                </label>
                {isCustom && <p className="text-xs text-gray-500">Editing the style below changes this page only.</p>}
                <AppearanceFields style={page.style} onChange={isCustom ? onPageChange : onGlobalChange} />
                {styleBar}
              </div>
            ) : (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-900">Page {index + 1}: {items.length} product{items.length === 1 ? '' : 's'}</p>
                <p className="mt-1 text-xs text-gray-500">Drag to change order, or remove an item. Arrow keys step between pages.</p>
                {items.length === 0 && <p className="mt-4 text-sm text-gray-500">Nothing on this page.</p>}
                <ol className="mt-3 space-y-2">
                  {items.map((item) => (
                    <li key={item.itemId} {...itemProps(item)}
                      className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 data-[dragging=true]:opacity-50">
                      <span className="min-w-0 flex-1">
                        {item.name}
                        {item.productCode && <span className="ml-2 font-mono text-xs text-gray-500">{item.productCode}</span>}
                      </span>
                      {removeForm && <span className="shrink-0">{removeForm(item)}</span>}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The cover, large, with its options beside it. Opened from the cover's Edit button. */
function CoverEditor({ title, coverDate, coverImage, style, options, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Fit the cover to the window height and the canvas width.
  const canvasRef = useRef(null)
  const [canvasW, setCanvasW] = useState(0)
  useLayoutEffect(() => {
    const el = canvasRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setCanvasW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const scale = Math.max(0.3, Math.min(1.1, (vh - 170) / PAGE_H, canvasW ? canvasW / PAGE_W : Infinity))

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit cover" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
          <span className="font-serif text-lg font-bold text-gray-900">Cover</span>
          <button type="button" onClick={onClose} className="rounded-md bg-royal-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-royal-blue-dark">Done</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="relative flex min-h-0 shrink-0 lg:w-3/4">
            <div ref={canvasRef} className="flex min-h-0 flex-1 bg-gray-200 p-6 lg:overflow-auto">
              <div className="m-auto">
                <Page scale={scale} framed={style.pageBorder} margin={style.pageMargin} ruleColor={style.ruleColor}>
                  <CoverContent title={title} date={coverDate} background={coverImage} style={style} />
                </Page>
              </div>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-5 lg:w-1/4 lg:border-l lg:border-gray-200">
            {options}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CataloguePreview({ title, coverDate, coverImage, coverOptions, order, showPrices, itemProps, removeForm, style: rawStyle, onGlobalStyleChange, onPageStyleChange, styleBar }) {
  const stored = useMemo(() => normalizeStoredStyle(rawStyle), [rawStyle])
  const globalSt = useMemo(() => normalizeStyle(stored), [stored])
  const overrides = stored.pageStyles

  // One block per product: its headings and the product itself.
  const blocks = useMemo(() => buildBlocks(order, globalSt.sectionHeadings), [order, globalSt.sectionHeadings])

  // Every distinct style in use: the catalogue style and each custom page's style.
  // Each is measured once, at its own width, so page breaks come out right.
  const styles = useMemo(() => {
    const map = new Map()
    const add = (st) => { const k = stableJson(st); if (!map.has(k)) map.set(k, st) }
    add(globalSt)
    Object.values(overrides).forEach(add)
    return map
  }, [globalSt, overrides])

  const measureRefs = useRef({})
  const boxRef = useRef(null)
  const [heights, setHeights] = useState({})
  const [boxW, setBoxW] = useState(0)
  // The page tapped in the spread, whose items are listed below. Null until one is tapped.
  const [selected, setSelected] = useState(null)
  // The cover, opened from its Edit button: it takes over the pane.
  const [coverOpen, setCoverOpen] = useState(false)
  // The page open in the large page editor. Null when closed.
  const [editing, setEditing] = useState(null)

  // Track the pane's width so the pages scale to fit.
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setBoxW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measure every product in every style in use; these heights decide the page breaks.
  useLayoutEffect(() => {
    const next = {}
    for (const k of styles.keys()) {
      next[k] = order.map((_, i) => measureRefs.current[k]?.[i]?.offsetHeight ?? 0)
    }
    setHeights(next)
  }, [order, showPrices, title, styles])

  const pages = useMemo(() => {
    const heightAt = (i, st) => heights[stableJson(st)]?.[i] ?? 0
    const overrideAt = (i) => overrides[String(order[i].itemId)] ?? null
    return breakPages(order.length, globalSt, overrideAt, heightAt).map((page) => {
      const key = String(order[page.items[0]].itemId)
      return { ...page, order, blocks, key, custom: Boolean(overrides[key]), globalCopy: globalSt }
    })
  }, [order, blocks, heights, overrides, globalSt])

  const scale = boxW ? Math.min(0.6, (boxW - 16) / 2 / PAGE_W) : 0.3
  const cellW = PAGE_W * scale
  const cellH = PAGE_H * scale
  const chosen = selected != null && selected < pages.length ? selected : null
  // Close the editor if its page no longer exists (for example after the last item is removed).
  // A change that alters the page count (such as a heading switch) keeps the editor open on the nearest page.
  useEffect(() => {
    if (editing == null) return
    if (pages.length === 0) setEditing(null)
    else if (editing >= pages.length) setEditing(pages.length - 1)
  }, [editing, pages.length])

  const editingPage = editing != null ? pages[editing] : null
  // Turning custom on copies the catalogue style to the page; off removes the copy.
  const handlePageChange = (next) => {
    if (!editingPage) return
    if (next == null) onPageStyleChange(editingPage.key, null)
    else onPageStyleChange(editingPage.key, next)
  }

  return (
    <div>
      <div ref={boxRef} className="relative rounded-lg bg-gray-100 p-2">
        {/* Hidden copies at true width, one per style in use, used only to measure products */}
        {[...styles.entries()].map(([k, st]) => (
          <div key={k} aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0, width: contentWidth(st), visibility: 'hidden' }}>
            {blocks.map((block, i) => (
              <div key={block.item.itemId} style={{ paddingBottom: st.spacing }}>
                <BlockView block={block} showPrices={showPrices} style={st}
                  rowRef={(el) => { (measureRefs.current[k] ??= [])[i] = el }} />
              </div>
            ))}
          </div>
        ))}

        {(
          <div className="relative mx-auto grid grid-cols-2 gap-y-4" style={{ width: cellW * 2 }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-gray-200" />

            {/* Cover, with Edit on hover, and an empty slot beside it */}
            <div className="group relative" style={{ width: cellW, height: cellH }}>
              <Page scale={scale} framed={globalSt.pageBorder} margin={globalSt.pageMargin} ruleColor={globalSt.ruleColor} onClick={() => setCoverOpen(true)}>
                <CoverContent title={title} date={coverDate} background={coverImage} style={globalSt} />
              </Page>
              <button type="button" onClick={() => setCoverOpen(true)}
                className="absolute right-2 top-2 z-30 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 opacity-0 shadow transition-opacity hover:border-royal-blue group-focus-within:opacity-100 group-hover:opacity-100">
                Edit
              </button>
            </div>
            <div style={{ width: cellW, height: cellH }} />

            {/* Product pages, two across, exactly as printed; tap a page to list its items below */}
            {pages.map((page, p) => (
              <div key={page.key} className="group relative" style={{ width: cellW, height: cellH }}>
                <PageFace scale={scale} page={page} index={p} showPrices={showPrices} selected={chosen === p} onClick={() => setSelected(p)} />
                {page.custom && (
                  <span className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Custom</span>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(p); setEditing(p) }}
                  className="absolute right-2 top-2 z-30 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 opacity-0 shadow transition-opacity hover:border-royal-blue group-focus-within:opacity-100 group-hover:opacity-100">
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Only the tapped page's products are listed below the pane */}
      {(
        <div className="mt-4">
          {order.length === 0 && <p className="text-xs text-gray-500">No products yet. Add some from the table on the left.</p>}
          {order.length > 0 && chosen == null && <p className="text-xs text-gray-500">Tap a page to list what is on it below.</p>}
          {chosen != null && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-900">Page {chosen + 1}: {pages[chosen].items.length} product{pages[chosen].items.length === 1 ? '' : 's'}</p>
                <button type="button" onClick={() => setEditing(chosen)} className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:border-royal-blue">Edit page</button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Drag to change order</p>
              <ol className="mt-3 space-y-2">
                {pages[chosen].items.map((i) => {
                  const item = order[i]
                  return (
                    <li key={item.itemId} {...itemProps(item)}
                      className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 data-[dragging=true]:opacity-50">
                      <span className="min-w-0 flex-1">
                        {item.name}
                        {item.productCode && <span className="ml-2 font-mono text-xs text-gray-500">{item.productCode}</span>}
                      </span>
                      {removeForm && <span className="shrink-0">{removeForm(item)}</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {coverOpen && (
        <CoverEditor
          title={title}
          coverDate={coverDate}
          coverImage={coverImage}
          style={globalSt}
          options={coverOptions}
          onClose={() => setCoverOpen(false)}
        />
      )}

      {editingPage && (
        <PageEditor
          index={editing}
          count={pages.length}
          page={editingPage}
          showPrices={showPrices}
          itemProps={itemProps}
          removeForm={removeForm}
          styleBar={styleBar}
          onGlobalChange={onGlobalStyleChange}
          onPageChange={handlePageChange}
          onGo={(next) => { setEditing(next); setSelected(next) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export { priceLines }
