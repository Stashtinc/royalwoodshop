import { PassThrough } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import { renderToPipeableStream } from 'react-dom/server'
import { ServerRouter, isRouteErrorResponse } from 'react-router'
import { isbot } from 'isbot'

const ABORT_DELAY = 10_000

/** As React Router's default, except for 404s. An unknown address is not a
 *  server error: it is answered below (a redirect, or a recorded 404), and
 *  logging each one would bury the real errors once old links arrive. */
export function handleError(error, { request }) {
  if (request.signal.aborted) return
  if (isRouteErrorResponse(error) && error.status === 404) return
  console.error(isRouteErrorResponse(error) && error.error ? error.error : error)
}

export default async function handleRequest(
  request, responseStatusCode, responseHeaders, routerContext,
) {
  // One address per page. WordPress ended every address with a slash, so the
  // old site's links and Google's index are full of them; the canonical form
  // has none. (A 404 with a slash is handled by the redirect lookup below,
  // which ignores it, so an old address still takes a single hop.)
  const { pathname, search } = new URL(request.url)
  if (responseStatusCode < 400 && pathname.length > 1 && pathname.endsWith('/')
      && (request.method === 'GET' || request.method === 'HEAD')) {
    // Leading slashes collapsed too, so //example.com/ cannot become a
    // redirect to another site.
    const location = '/' + pathname.replace(/^\/+|\/+$/g, '') + search
    return new Response(null, { status: 301, headers: { Location: location } })
  }

  // A 404 may be an address from the old WordPress site: send it to the new
  // one, or record it so the gap in the redirect map shows up.
  if (responseStatusCode === 404) {
    const { redirectFor, recordNotFound } = await import('./lib/redirects.server.js')
    const moved = await redirectFor(request)
    if (moved) return moved
    recordNotFound(request)
  }
  return render(request, responseStatusCode, responseHeaders, routerContext)
}

function render(request, responseStatusCode, responseHeaders, routerContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get('user-agent')

    // Crawlers get the fully rendered document rather than a stream, so the
    // complete markup is present in the first response.
    const readyOption =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? 'onAllReady'
        : 'onShellReady'

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough()
          responseHeaders.set('Content-Type', 'text/html')
          resolve(new Response(createReadableStreamFromReadable(body), {
            headers: responseHeaders,
            status: responseStatusCode,
          }))
          pipe(body)
        },
        onShellError(error) { reject(error) },
        onError(error) {
          responseStatusCode = 500
          if (shellRendered) console.error(error)
        },
      },
    )
    setTimeout(abort, ABORT_DELAY)
  })
}
