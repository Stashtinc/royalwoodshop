import { Link } from 'react-router'
import logo from '../assets/images/logo.svg'
import { productCategories } from '../data/productCategories'

const quickLinks = [
  { label: 'Products', to: '/#products' },
  { label: 'Custom Millwork', to: '/custom-millwork' },
  { label: 'About', to: '/#about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Blog', to: '/blog' },
  { label: 'Resources', to: '/resources' },
]

// Same destinations as the homepage product cards.
const productLinks = [
  'Interior Trim & Mouldings',
  'Interior Doors',
  'Custom Millwork',
  'Wall & Ceiling Panelling',
  'Stairs & Railings',
].map((label) => ({ label, to: productCategories.find((c) => c.name === label).path }))

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

function PinterestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"
        fill="currentColor"
      />
    </svg>
  )
}

function HouzzIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 9l8-7 8 7v10a2 2 0 0 1-2 2h-3v-5h-6v5H6a2 2 0 0 1-2-2V9z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="currentColor"
      />
    </svg>
  )
}

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/theroyalwoodshop', Icon: FacebookIcon },
  { label: 'Pinterest', href: 'https://www.pinterest.com/royalwoodshop', Icon: PinterestIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/royalwoodshop', Icon: InstagramIcon },
  { label: 'Houzz', href: 'https://www.houzz.com/professionals/royalwoodshop', Icon: HouzzIcon },
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
              {productLinks.map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
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
              <a href="tel:9057271387" className="transition-colors hover:text-white">
                905-727-1387
              </a>
              <a href="mailto:info@royalwoodshop.com" className="transition-colors hover:text-white">
                info@royalwoodshop.com
              </a>
              <p>Monday – Friday, 7:00am – 5:30pm</p>
              <p>Saturday, 9:00am – 4:00pm</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 border-t border-white/15 pt-8 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="font-sans text-sm text-white/60">
              © {new Date().getFullYear()} The Royal Wood Shop Ltd. All rights reserved.
            </p>

            {/* Deliberately understated, and nofollow so it never invites
                automated login attempts. */}
            <a
              href="/admin/login"
              rel="nofollow"
              aria-label="Staff login"
              className="inline-flex items-center gap-1.5 font-sans text-sm text-white/45 transition-colors hover:text-white"
            >
              <svg
                width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"
                fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="2.5" y="7" width="11" height="7" rx="1.5" />
                <path d="M5 7V4.75a3 3 0 0 1 6 0V7" />
              </svg>
              Login
            </a>
          </div>

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
