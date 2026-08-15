import { useRef, useState } from 'react'
import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getPostById, savePost, listCategories, slugTaken } from '../../lib/posts.server'
import { saveUpload } from '../../lib/uploads.server'
import { log } from '../../lib/activity.server'
import { draftArticle, draftMetadata, isConfigured as aiConfigured } from '../../lib/ai.server'
import RichText from '../../components/admin/RichText'
import AiAssist from '../../components/admin/AiAssist'

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200)

export async function loader({ request, params }) {
  await requireUser(request)
  const isNew = params.id === 'new'
  const post = isNew ? null : await getPostById(params.id)
  if (!isNew && !post) throw new Response('Not found', { status: 404 })
  return { post, categories: await listCategories(), isNew, aiEnabled: aiConfigured() }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const isNew = params.id === 'new'

  // AI Assist posts to this same action. Handled first and returned early:
  // generating a draft must never write anything.
  const intent = String(f.get('intent') ?? '')
  if (intent === 'ai-article' || intent === 'ai-metadata') {
    try {
      if (intent === 'ai-article') {
        const draft = await draftArticle({
          topic: String(f.get('topic') ?? ''),
          notes: String(f.get('notes') ?? ''),
          length: String(f.get('length') ?? 'medium'),
        })
        return { ai: { kind: 'article', ...draft } }
      }
      const meta = await draftMetadata({
        title: String(f.get('title') ?? ''),
        contentHtml: String(f.get('contentHtml') ?? ''),
      })
      return { ai: { kind: 'metadata', ...meta } }
    } catch (e) {
      return { aiError: e.message }
    }
  }

  const title = String(f.get('title') ?? '').trim()
  if (!title) return { error: 'An article needs a title.' }

  let slug = slugify(f.get('slug') || title)
  if (!slug) return { error: 'That title produces an empty web address. Add a slug.' }
  if (await slugTaken(slug, isNew ? null : params.id)) {
    return { error: `Another article already uses /${slug}. Choose a different address.` }
  }

  // A featured image may be uploaded alongside the article.
  let featuredImage = String(f.get('featuredImageExisting') ?? '')
  const upload = f.get('featuredImageFile')
  if (upload && typeof upload !== 'string' && upload.size > 0) {
    const res = await saveUpload(upload, { slug })
    if (res.error) return { error: res.error }
    featuredImage = res.storageKey
  }

  const status = f.get('status') === 'published' ? 'published' : 'draft'
  const wasPublished = !isNew && (await getPostById(params.id))?.status === 'published'

  const id = await savePost(isNew ? null : params.id, {
    title,
    slug,
    excerpt: String(f.get('excerpt') ?? '').trim(),
    contentHtml: String(f.get('contentHtml') ?? ''),
    featuredImage,
    featuredImageAlt: String(f.get('featuredImageAlt') ?? '').trim(),
    status,
    seoTitle: String(f.get('seoTitle') ?? '').trim(),
    seoDescription: String(f.get('seoDescription') ?? '').trim(),
    publishedAt: f.get('publishedAt') || (status === 'published' ? new Date().toISOString() : null),
  }, f.getAll('categories').map(String))

  if (isNew) {
    await log(user, 'post.created', { entityType: 'post', entityId: id, entityLabel: title })
  } else if (status === 'published' && !wasPublished) {
    await log(user, 'post.published', { entityType: 'post', entityId: id, entityLabel: title })
  } else {
    await log(user, 'post.updated', { entityType: 'post', entityId: id, entityLabel: title })
  }

  if (isNew) throw new Response(null, { status: 302, headers: { Location: `/admin/posts/${id}` } })
  return { saved: status === 'published' ? 'Saved and published.' : 'Saved as a draft.' }
}

const field = 'rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-royal-blue'

export default function PostEdit() {
  const { post, categories, isNew, aiEnabled } = useLoaderData()
  const data = useActionData()
  const nav = useNavigation()
  // The AI fetcher also drives nav.state on this route, so distinguish a real
  // save from a generation — otherwise the Save button reads "Saving…" while
  // an article is being written.
  const saving = nav.state === 'submitting' && nav.formData?.get('intent') == null

  const [assistOpen, setAssistOpen] = useState(false)
  // The slug warning is only true once the address actually differs from the
  // one that is live. Showing it permanently trained the eye to ignore it.
  const [slug, setSlug] = useState(post?.slug ?? '')
  const slugChanged = !isNew && slug.trim() !== (post?.slug ?? '')
  const editorApi = useRef(null)
  const formRef = useRef(null)

  /** Reads the live form so the assistant sees unsaved edits, not the last save. */
  const getEditorState = () => ({
    title: formRef.current?.elements.title?.value ?? '',
    contentHtml: editorApi.current?.getHtml() ?? '',
  })

  const useArticle = ({ title, html }) => {
    editorApi.current?.setHtml(html)
    const titleInput = formRef.current?.elements.title
    // Never clobber a title the author has already chosen.
    if (titleInput && !titleInput.value.trim() && title) titleInput.value = title
  }

  const useMetadata = ({ excerpt, seoTitle, seoDescription }) => {
    const el = formRef.current?.elements
    if (!el) return
    if (el.excerpt) el.excerpt.value = excerpt
    if (el.seoTitle) el.seoTitle.value = seoTitle
    if (el.seoDescription) el.seoDescription.value = seoDescription
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/posts" className="text-sm text-royal-blue hover:underline">← Blog</Link>

        <div className="ml-auto flex items-center gap-4">
          <button type="button" onClick={() => setAssistOpen(true)} disabled={!aiEnabled}
            title={aiEnabled ? 'Draft or summarise with Claude' : 'Set ANTHROPIC_API_KEY to enable — see docs/ai-assist-setup.md'}
            className="flex items-center gap-2 rounded-lg border border-royal-blue px-3.5 py-2 text-sm font-medium text-royal-blue transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2.5l1.6 4.3 4.4 1.7-4.4 1.7L10 14.5 8.4 10.2 4 8.5l4.4-1.7L10 2.5z" />
              <path d="M15.5 13.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
            </svg>
            AI Assist
          </button>

          {post && (
            <a href={`/${post.slug}`} target="_blank" rel="noreferrer"
              className="text-sm text-gray-500 hover:text-royal-blue">
              View on site ↗
            </a>
          )}
        </div>
      </div>

      <AiAssist
        open={assistOpen}
        onClose={() => setAssistOpen(false)}
        onUseArticle={useArticle}
        onUseMetadata={useMetadata}
        getEditorState={getEditorState}
      />

      {data?.saved && <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">{data.saved}</p>}
      {data?.error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>}

      <Form ref={formRef} method="post" encType="multipart/form-data" className="flex flex-col gap-6">
        <input type="hidden" name="featuredImageExisting" defaultValue={post?.featuredImage ?? ''} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Title</span>
          <input name="title" defaultValue={post?.title ?? ''} required
            className="rounded-lg border border-gray-300 px-3 py-2.5 font-serif text-lg outline-none focus:border-royal-blue" />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Article</span>
              <RichText name="contentHtml" defaultValue={post?.contentHtml ?? ''} apiRef={editorApi} />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">
                Summary <span className="font-normal text-gray-400">shown on the blog listing</span>
              </span>
              <textarea name="excerpt" rows={3} defaultValue={post?.excerpt ?? ''} className={field} />
            </label>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-serif font-bold text-tundora">Publishing</h2>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Status</span>
                <select name="status" defaultValue={post?.status ?? 'published'} className={field}>
                  <option value="draft">Draft — not on the site</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Date</span>
                <input type="date" name="publishedAt" className={field}
                  defaultValue={
                    post?.publishedAt
                      ? new Date(post.publishedAt).toISOString().slice(0, 10)
                      : new Date().toISOString().slice(0, 10)
                  } />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">
                  Web address <span className="font-normal text-gray-400">royalwoodshop.com/…</span>
                </span>
                <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)}
                  placeholder="from the title" className={field} />
                {slugChanged && (
                  <span className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="8" cy="8" r="6.25" /><path d="M8 5v3.5" />
                      <circle cx="8" cy="10.8" r="0.35" fill="currentColor" stroke="none" />
                    </svg>
                    <span>
                      Anyone who has linked to <strong>/{post.slug}</strong> will get a
                      &ldquo;not found&rdquo; page after this is saved.
                    </span>
                  </span>
                )}
              </label>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-serif font-bold text-tundora">Categories</h2>
              <div className="flex flex-col gap-1.5">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="categories" value={c.name}
                      defaultChecked={post?.categories?.includes(c.name)}
                      className="h-4 w-4 rounded border-gray-300" />
                    {c.name} <span className="text-xs text-gray-400">{c.n}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-serif font-bold text-tundora">Header image</h2>
              {post?.featuredImage && (
                <img src={post.featuredImage} alt="" className="aspect-[3/2] w-full rounded-lg object-cover" />
              )}
              <input type="file" name="featuredImageFile" accept="image/*"
                className="text-xs text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1 file:text-xs" />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Image description</span>
                <input name="featuredImageAlt" defaultValue={post?.featuredImageAlt ?? ''} className={field} />
              </label>
            </section>

            <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="font-serif font-bold text-tundora">Search listing</h2>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">
                  Page title <span className="font-normal text-gray-400">blank uses the article title</span>
                </span>
                <input name="seoTitle" defaultValue={post?.seoTitle ?? ''} maxLength={200} className={field} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">
                  Description <span className="font-normal text-gray-400">blank uses the summary</span>
                </span>
                <textarea name="seoDescription" rows={3} defaultValue={post?.seoDescription ?? ''} className={field} />
              </label>
            </section>
          </aside>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving}
            className="rounded-lg bg-royal-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-blue-dark disabled:opacity-60">
            {saving ? 'Saving…' : isNew ? 'Create article' : 'Save changes'}
          </button>
          <Link to="/admin/posts" className="text-sm text-gray-600 hover:underline">Cancel</Link>
        </div>
      </Form>
    </div>
  )
}
