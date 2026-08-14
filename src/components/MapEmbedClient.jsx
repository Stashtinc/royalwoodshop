import { lazy, Suspense, useEffect, useState } from 'react'

// Leaflet touches `window` when it is imported, so the map can only be loaded
// in the browser. Everything else on the page still renders on the server.
const MapEmbed = lazy(() => import('./MapEmbed'))

const Placeholder = () => (
  <div className="h-[400px] w-full animate-pulse rounded-2xl bg-gray-100" aria-hidden="true" />
)

export default function MapEmbedClient(props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <Placeholder />
  return (
    <Suspense fallback={<Placeholder />}>
      <MapEmbed {...props} />
    </Suspense>
  )
}
