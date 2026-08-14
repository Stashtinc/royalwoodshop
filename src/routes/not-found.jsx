import { Link } from 'react-router'
import { pageMeta } from '../seo'

export const meta = () => [
  ...pageMeta({
    title: 'Page not found',
    description: 'That page has moved or no longer exists.',
    path: '/404',
  }),
  { name: 'robots', content: 'noindex, follow' },
]

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center gap-5 px-6 py-24 text-center">
      <h1 className="font-serif text-4xl font-bold text-tundora">Page not found</h1>
      <p className="max-w-xl font-sans text-gray-600">
        That page has moved or no longer exists. Our catalogue was rebuilt recently,
        so a few older links have changed.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/products" className="rounded-lg bg-royal-blue px-6 py-3 font-sans text-sm text-white hover:bg-royal-blue-dark">
          Browse the catalogue
        </Link>
        <Link to="/contact" className="rounded-lg border border-gray-300 px-6 py-3 font-sans text-sm text-tundora hover:border-royal-blue">
          Contact us
        </Link>
      </div>
    </main>
  )
}
