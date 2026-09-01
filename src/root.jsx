import {
  Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, isRouteErrorResponse,
} from 'react-router'
import stylesheet from './index.css?url'
import Header from './components/Header'
import PageHeader from './components/PageHeader'
import Footer from './components/Footer'
import royalEdgeHero from './assets/images/royal-edge-hero.jpg'
import servicesHero from './assets/images/services-hero.jpg'

export const links = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&family=Poppins:wght@400;500&display=swap',
  },
]

const pageHeaderImages = {
  '/the-royal-edge': { image: royalEdgeHero, imageAlt: 'Close-up of custom oak moulding profiles' },
  '/services': { image: servicesHero, imageAlt: 'Modern oak staircase with black metal balusters' },
}

/**
 * The document shell only.
 *
 * Deliberately free of router hooks. Layout is rendered before the router
 * context is established during client hydration, so calling useLocation()
 * here throws, kills the whole client tree, and leaves a page that looks
 * correct but is completely dead. Page chrome lives in Root below, which
 * renders inside the router.
 */
export function Layout({ children }) {
  // Browser extensions (Grammarly, password managers, translators) inject
  // attributes and nodes into <html> and <body> before React hydrates. Because
  // the whole document is the hydration root, those edits read as mismatches.
  // suppressHydrationWarning tells React to tolerate them here.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  // Pages that render standalone, without the site header, banner or footer.
  // The admin has its own chrome, and the quotation page is a printable
  // document, so wrapping either in the marketing layout is wrong.
  const isBare = pathname === '/quotation' || pathname.startsWith('/admin')

  if (isBare) return <Outlet />

  return (
    <div className="flex min-h-screen flex-col">
      <div data-print="hide"><Header /></div>
      {!isHome && <div data-print="hide"><PageHeader {...pageHeaderImages[pathname]} /></div>}
      <Outlet />
      <div data-print="hide"><Footer /></div>
    </div>
  )
}

export function ErrorBoundary({ error }) {
  // DOM NotFoundError (removeChild/insertBefore) is thrown by browser extensions
  // that inject nodes React doesn't own. It is not a real 404 — reload fixes it.
  const isDomError = error instanceof Error && error.name === 'NotFoundError' && !isRouteErrorResponse(error)
  const is404 = !isDomError && isRouteErrorResponse(error) && error.status === 404

  // In development, show what actually failed. A friendly message with the
  // cause hidden means guessing, and guessing is slow.
  const detail = import.meta.env.DEV
    ? (isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}\n\n${typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2)}`
        : (error?.stack || error?.message || String(error)))
    : null

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-24 text-center">
      <h1 className="font-serif text-4xl font-bold text-tundora">
        {is404 ? 'Page not found' : isDomError ? 'Something interrupted this page' : 'Something went wrong'}
      </h1>
      <p className="font-sans text-gray-600">
        {is404
          ? 'That page has moved or no longer exists. Try the catalogue, or get in touch and we will point you the right way.'
          : isDomError
          ? 'A browser extension modified the page in a way that caused a conflict. Reloading usually fixes this.'
          : 'Please try again, or contact us if the problem continues.'}
      </p>
      {isDomError
        ? <button onClick={() => window.location.reload()} className="font-sans font-medium text-tundora underline">Reload page</button>
        : <a href="/products" className="font-sans font-medium text-tundora underline">Browse the catalogue</a>
      }

      {detail && (
        <pre className="mt-6 max-h-[50vh] overflow-auto rounded-xl bg-red-950 p-4 text-left font-mono text-xs leading-relaxed whitespace-pre-wrap text-red-100">
          {detail}
        </pre>
      )}
    </main>
  )
}
