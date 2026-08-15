import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getPostById, savePost, listCategories, slugTaken } from '../../lib/posts.server'
import { saveUpload } from '../../lib/uploads.server'
import { log } from '../../lib/activity.server'
import RichText from '../../components/admin/RichText'

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200)

export async function loader({ request, params }) {
  await requireUser(request)
  const isNew = params.id === 'new'
  const post = isNew ? null : await getPostById(params.id)
  if (!isNew && !post) throw new Response('Not found', { status: 404 })
  return { post, categories: await listCategories(), isNew }
}

export async function action({ request, params }) {
  const user = await requireUser(request)
  const f = await request.formData()
  const isNew = params.id === 'new'

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
  const { post, categories, isNew } = useLoaderData()
  const data = useActionData()
  const nav = useNavigation()
  const saving = nav.state === 'submitting'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/posts" className="text-sm text-royal-blue hover:underline">← Blog</Link>
        {post && (
          <a href={`/${post.slug}`} target="_blank" rel="noreferrer"
            className="ml-auto text-sm text-gray-500 hover:text-royal-blue">
            View on site ↗
          </a>
        )}
      </div>

      {data?.saved && <p className="rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-800">{data.saved}</p>}
      {data?.error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{data.error}</p>}

      <Form method="post" encType="multipart/form-data" className="flex flex-col gap-6">
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
              <RichText name="contentHtml" defaultValue={post?.contentHtml ?? ''} />
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
                <select name="status" defaultValue={post?.status ?? 'draft'} className={field}>
                  <option value="draft">Draft — not on the site</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">Date</span>
                <input type="date" name="publishedAt" className={field}
                  defaultValue={post?.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : ''} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-600">
                  Web address <span className="font-normal text-gray-400">royalwoodshop.com/…</span>
                </span>
                <input name="slug" defaultValue={post?.slug ?? ''} placeholder="from the title" className={field} />
                {!isNew && (
                  <span className="text-[11px] text-amber-700">
                    Changing this breaks existing links to the article.
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
