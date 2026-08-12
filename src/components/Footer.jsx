import { Link } from 'react-router-dom'
import logo from '../assets/images/logo.svg'

const quickLinks = [
  { label: 'Products', to: '/#products' },
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/#about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Resources', to: '/resources' },
]

const productLinks = [
  'Interior Trim & Mouldings',
  'Interior Doors – Stock & Custom',
  'Custom Millwork',
  'Wall & Ceiling Panelling',
  'Stairs & Railings',
]

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 8.5h2.5V5h-2.5C12.5 5 11 6.6 11 9v2H9v3.5h2V22h3.5v-7.5H17l.5-3.5h-3V9c0-.4.3-.5.5-.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: InstagramIcon },
]

export default function Footer() {
  return (
    <footer className="w-full bg-royal-blue text-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <img src={logo} alt="The Royal Wood Shop" className="h-auto w-[180px]" />
            <p className="font-sans text-sm leading-relaxed text-white/70">
              A leading specialized supplier of interior trim, mouldings, and doors for upscale
              renovation and new build projects in Toronto, GTA and York Region.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-white">Quick Links</h3>
            <nav className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="font-sans text-sm text-white/70 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-white">Products</h3>
            <nav className="flex flex-col gap-3">
              {productLinks.map((label) => (
                <Link
                  key={label}
                  to="/#products"
                  className="font-sans text-sm text-white/70 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-serif text-lg font-bold text-white">Contact</h3>
            <div className="flex flex-col gap-3 font-sans text-sm text-white/70">
              <p>18237 Woodbine Ave, Sharon, ON L0G 1V0</p>
              <a href="tel:19050000000" className="transition-colors hover:text-white">
                (905) 000-0000
              </a>
              <a href="mailto:info@royalwoodshop.com" className="transition-colors hover:text-white">
                info@royalwoodshop.com
              </a>
              <p>Monday – Friday, 8:00am – 5:00pm</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 border-t border-white/15 pt-8 sm:flex-row sm:justify-between">
          <p className="font-sans text-sm text-white/60">
            © {new Date().getFullYear()} The Royal Wood Shop Ltd. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white hover:text-white"
              >
                <social.Icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
