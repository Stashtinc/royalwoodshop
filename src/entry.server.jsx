import { PassThrough } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import { renderToPipeableStream } from 'react-dom/server'
import { ServerRouter } from 'react-router'
import { isbot } from 'isbot'

const ABORT_DELAY = 10_000

export default function handleRequest(
  request, responseStatusCode, responseHeaders, routerContext,
) {
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
