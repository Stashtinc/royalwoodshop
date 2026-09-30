import { useEffect, useState } from 'react'
import { productSeoTitle, productSeoDescription, withSiteName } from '../../seo'

/** The same values the product page will use, read from the form as it is now. */
function readForm(form) {
  const f = new FormData(form)
  const get = (k) => String(f.get(k) ?? '').trim()
  const species = []
  for (const [key, value] of f.entries()) {
    if (key.startsWith('species:') && value) species.push(key.slice('species:'.length))
  }
  f.getAll('other_species_name').map((v) => String(v).trim()).filter(Boolean).forEach((n) => species.push(n))
  return { name: get('name'), productCode: get('productCode'), description: get('description'), size: get('sizeDisplay'), species }
}

/**
 * Page title and meta description. Left blank they are generated, so the
 * generated text is shown as the placeholder — updated as the name, code,
 * description, size or species change — instead of an empty box.
 */
export default function SeoFields({ formId, initial, seoTitle = '', seoDescription = '', Label, field }) {
  const [values, setValues] = useState(initial)

  useEffect(() => {
    const form = document.getElementById(formId)
    if (!form) return
    const update = () => setValues(readForm(form))
    update()
    form.addEventListener('input', update)
    form.addEventListener('change', update)
    return () => {
      form.removeEventListener('input', update)
      form.removeEventListener('change', update)
    }
  }, [formId])

  const title = productSeoTitle(values)
  const description = productSeoDescription(values)

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <Label hint="leave blank to use the generated title shown">Page title</Label>
        <input name="seoTitle" defaultValue={seoTitle} maxLength={200} className={field}
          placeholder={title ? withSiteName(title) : 'Generated from the product name'} />
      </label>
      <label className="flex flex-col gap-1.5">
        <Label hint="leave blank to use the generated description shown">Meta description</Label>
        <textarea name="seoDescription" rows={2} defaultValue={seoDescription} className={field}
          placeholder={description} />
      </label>
    </>
  )
}
