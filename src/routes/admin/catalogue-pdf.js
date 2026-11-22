import { requireUser } from '../../lib/auth.server'
import { getPrintCatalogue } from '../../lib/print-catalogues.server'

/**
 * /admin/catalogue/:id/pdf: the saved catalogue as a PDF.
 * Opens inline in a new tab; ?download=1 sends it as a file.
 */
export async function loader({ request, params }) {
  await requireUser(request)
  const catalogue = await getPrintCatalogue(params.id)
  if (!catalogue) throw new Response('Not found', { status: 404 })

  const { renderCataloguePdf } = await import('../../lib/print-catalogue-pdf.server.js')
  const pdf = await renderCataloguePdf(catalogue)

  const url = new URL(request.url)
  const filename = `${(catalogue.title || 'catalogue').replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`
  const disposition = url.searchParams.has('download') ? 'attachment' : 'inline'
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
