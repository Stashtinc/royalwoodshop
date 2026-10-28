import { useLoaderData } from 'react-router'
import GetAQuote from '../pages/GetAQuote'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Get a Quote',
  description: 'Request a quote for your renovation, new build or large order. Choose products from the catalogue, attach your plans or door schedule, and our team will come back to you.',
  path: '/get-a-quote',
})

/** Published products only, slimmed to what the picker and the form need. */
export async function loader() {
  let all = []
  try {
    const { getDb } = await import('../lib/db.server.js')
    const { getAllProducts } = await import('../db/queries.js')
    all = await getAllProducts(await getDb())
  } catch {}
  if (!all.length) {
    const { loadAllProducts } = await import('../lib/products.server.js')
    all = await loadAllProducts()
  }
  // Each product's woods and their purchase increments (see productWoods).
  let woods = new Map()
  try {
    const { productWoods } = await import('../lib/quote.server.js')
    woods = await productWoods(all.map((p) => p.dbId))
  } catch {}
  // One quote line per product and wood, as the product page's rows show them.
  // A product with no wood (no Part IDs or species) is quoted once, as itself.
  const parts = all
    .filter((p) => (p.status ?? 'published') === 'published')
    .flatMap((p) => {
      // The database id, not the slug: the server looks lines up by it.
      const base = {
        productId: p.dbId,
        name: p.name,
        productCode: p.productCode,
        sizeDisplay: p.sizeDisplay,
        // getAllProducts names the category `category` (the catalogue reads it the same way).
        categoryName: p.category ?? null,
        availability: p.availability,
        uom: p.uom,
        image: p.image ?? null,
        imageWidth: p.imageWidth ?? null,
        imageRole: p.imageRole ?? null,
      }
      const choices = woods.get(p.dbId) ?? []
      if (!choices.length) return [{ ...base, key: `${p.dbId}|`, species: null, partId: null, increment: null }]
      return choices.map((w) => ({
        ...base,
        key: `${p.dbId}|${w.name}`,
        species: w.name,
        partId: w.partId,
        increment: w.increment,
        // The Part ID is what the line is called; the product code is the fallback.
        productCode: w.partId ?? p.productCode,
      }))
    })
    .sort((a, b) => (a.productCode ?? '').localeCompare(b.productCode ?? '') || a.name.localeCompare(b.name))
  return { parts }
}

let limiter

export async function action({ request }) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const form = await request.formData()
  const { validateQuote, isBot, resolveItems, readFiles, saveAndNotify } = await import('../lib/quote.server.js')

  // Pretend success so the bot learns nothing, but store nothing.
  if (isBot(form)) return { ok: true }

  const { createLimiter, clientIp } = await import('../lib/rate-limit.server.js')
  limiter ??= createLimiter({ limit: 10, windowMs: 60 * 60_000 })
  const ip = clientIp(request)
  if (limiter.retryAfter(ip)) {
    return { formError: 'Too many quote requests from your connection. Please try again later, or call us at 905-727-1387.' }
  }
  limiter.hit(ip)

  const { values, items, files, errors } = validateQuote(form)
  if (Object.keys(errors).length) return { errors, values }

  const resolved = await resolveItems(items)
  if (resolved.errors) return { errors: resolved.errors, values }

  const stored = await readFiles(files)
  const { ok } = await saveAndNotify(values, resolved.lines, stored, { ip })
  if (!ok) {
    return {
      values,
      formError: 'Sorry, your request could not be sent. Please call us at 905-727-1387 or email info@royalwoodshop.com.',
    }
  }
  return { ok: true }
}

export default function Route() {
  const { parts } = useLoaderData()
  return <GetAQuote parts={parts} />
}
