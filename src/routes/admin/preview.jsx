import { useEffect, useState } from 'react'
import { requireUser } from '../../lib/auth.server'
import { cleanWpContent } from '../../lib/wpContent'

// Signed-in admins only. The article editor's Preview button stores the unsaved
// draft in localStorage and opens this page, so nothing has to be saved first.
export const PREVIEW_KEY = 'rws-article-preview'

export async function loader({ request }) {
  await requireUser(request)
  return null
}

export default function ArticlePreview() {
  const [draft, setDraft] = useState(undefined)

  useEffect(() => {
    try {
      setDraft(JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? 'null'))
    } catch {
      setDraft(null)
    }
  }, [])

  if (draft === undefined) return null

  if (!draft) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 font-sans text-gray-700">
        <p>No preview is loaded. Open Preview from the article editor.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbfbfb]">
      <div className="bg-royal-blue px-6 py-2 text-center font-sans text-sm text-white">
        Preview. This article is not published and is only visible to signed-in admins.
      </div>
      <article className="mx-auto max-w-[720px] px-6 py-16">
        {draft.date && (
          <p className="font-sans text-xs font-medium tracking-wide text-gray-500 uppercase">{draft.date}</p>
        )}
        <h1 className="mt-3 font-serif text-4xl font-bold text-tundora">{draft.title || 'Untitled'}</h1>
        {draft.excerpt && <p className="mt-4 font-sans text-lg text-gray-600">{draft.excerpt}</p>}
        <div
          className="prose-royal mt-8"
          dangerouslySetInnerHTML={{ __html: cleanWpContent(draft.contentHtml ?? '') }}
        />
      </article>
    </main>
  )
}
