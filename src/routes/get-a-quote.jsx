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
  const products = all
    .filter((p) => (p.status ?? 'published') === 'published')
    .map((p) => ({
      id: p.id,
      name: p.name,
      productCode: p.productCode,
      sizeDisplay: p.sizeDisplay,
      categoryName: p.categoryName,
      species: p.species ?? [],
      availability: p.availability,
      uom: p.uom,
      image: p.image ?? null,
      imageWidth: p.imageWidth ?? null,
      imageRole: p.imageRole ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { products }
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
  const { products } = useLoaderData()
  return <GetAQuote products={products} />
}
