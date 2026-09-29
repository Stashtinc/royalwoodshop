import Page from '../pages/Contact'
import { pageMeta } from '../seo'

export const meta = () => pageMeta({
  title: 'Contact Us',
  description: 'Visit our East Gwillimbury showroom, or get in touch about trim, doors and custom millwork for your project. Delivery throughout the GTA and York Region.',
  path: '/contact',
})

export async function action({ request }) {
  const { validateContact, isBot, saveAndNotify } = await import('../lib/contact.server')
  const form = await request.formData()

  // Pretend success so the bot learns nothing, but store nothing.
  if (isBot(form)) return { ok: true }

  const { values, errors } = validateContact(form)
  if (Object.keys(errors).length) return { errors, values }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  const { ok } = await saveAndNotify(values, { ip })
  if (!ok) {
    return {
      values,
      formError: 'Sorry — your message could not be sent. Please call us at 905-727-1387 or email info@royalwoodshop.com.',
    }
  }
  return { ok: true }
}

export default function Route() { return <Page /> }
