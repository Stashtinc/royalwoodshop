import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import NavDropdownPanel from './NavDropdownPanel'
import SearchResultsList from './SearchResultsList'
import useSiteSearch from '../hooks/useSiteSearch'
import { productsMenu, servicesMenu, aboutMenu, resourcesMenu } from '../data/navMenus'
import logoBlue from '../assets/images/logo-blue.svg'

const navLinks = [
  { label: 'Products', to: '/products', menu: 'products' },
  { label: 'Services', to: '/services', menu: 'services' },
  { label: 'About Royal', to: '/#about', menu: 'about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Resources', to: '/resources', menu: 'resources' },
]

const mobileMenuItems = {
  products: [...productsMenu.groups.flatMap((g) => g.items), ...productsMenu.items],
  services: servicesMenu,
  about: aboutMenu,
  resources: resourcesMenu,
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openMobileMenu, setOpenMobileMenu] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)
  const { query, setQuery, results } = useSiteSearch()
  const searchRef = useRef(null)
  const navigate = useNavigate()

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setQuery('')
    setSelectedResult(null)
  }, [setQuery])

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false)
    setQuery('')
  }, [setQuery])

  function pickResult(result) {
    navigate(result.path)
    closeSearch()
  }

  function mobilePickResult(result) {
    navigate(result.path)
    closeMobileSearch()
  }

  function submitResult() {
    if (!selectedResult) return
    navigate(selectedResult.path)
    closeSearch()
  }

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 100)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        closeSearch()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchOpen, closeSearch])

  // Every page renders its own embedded nav banner at xl+ (Hero on home, PageHeader elsewhere),
  // so this header must stay out of flow (fixed, not sticky) and only fade in once that banner's
  // nav row has scrolled out of view — otherwise it'd duplicate/push the banner down.
  const desktopFixed = `xl:fixed xl:inset-x-0 xl:top-0 xl:transition-all xl:duration-300 ${
    scrolled
      ? 'xl:translate-y-0 xl:opacity-100 xl:pointer-events-auto'
      : 'xl:pointer-events-none xl:-translate-y-full xl:opacity-0'
  }`

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white shadow-sm transition-shadow duration-300 ${desktopFixed}`}
    >
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-6 lg:px-8">
        <Link to="/" className="shrink-0">
          <img src={logoBlue} alt="The Royal Wood Shop" className="h-auto w-[100px]" />
        </Link>

        <nav className="relative hidden h-full flex-1 items-center justify-end gap-8 xl:flex">
          {navLinks.map((link) => (
            <div key={link.label} className="group/item flex h-full items-center">
              <Link
                to={link.to}
                className="flex h-full items-center border-b-4 border-transparent px-4 font-body text-xs font-bold tracking-wide whitespace-nowrap text-gray-500 uppercase transition-colors hover:border-royal-blue hover:bg-parchment hover:text-royal-blue"
              >
                {link.label}
              </Link>
              {link.menu && (
                <div className="invisible absolute top-full right-0 z-30 opacity-0 transition-all duration-150 group-hover/item:visible group-hover/item:opacity-100">
                  <NavDropdownPanel menu={link.menu} />
                </div>
              )}
            </div>
          ))}

          <div ref={searchRef} className="relative flex h-full shrink-0 items-center">
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                if (searchOpen) closeSearch()
                else setSearchOpen(true)
              }}
              className={`flex h-full items-center justify-center border-b-4 px-2 text-tundora/70 transition-colors hover:border-royal-blue hover:bg-parchment hover:text-royal-blue ${
                searchOpen ? 'border-royal-blue bg-parchment text-royal-blue' : 'border-transparent'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12.7" y1="12.7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {searchOpen && (
              <div className="absolute top-full right-0 z-30 w-80 overflow-hidden rounded-md bg-white shadow-2xl">
                <div className="px-4 py-3">
                  {selectedResult ? (
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 py-1.5 pr-1.5 pl-3">
                      <span className="flex-1 truncate rounded-full bg-royal-blue/10 px-2.5 py-1 font-sans text-xs font-medium text-royal-blue">
                        {selectedResult.label}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove selection"
                        onClick={() => setSelectedResult(null)}
                        className="shrink-0 p-1 text-gray-400 transition-colors hover:text-royal-blue"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Go to result"
                        onClick={submitResult}
                        className="shrink-0 rounded-md bg-royal-blue p-1.5 text-white transition-colors hover:bg-royal-blue-dark"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M2 7h10M8 3l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                        placeholder="Search for something..."
                        className="w-full rounded-md border border-gray-200 py-2 pr-9 pl-3 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
                      />
                      <button
                        type="button"
                        aria-label="Close search"
                        onClick={closeSearch}
                        className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-royal-blue"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {!selectedResult && query.trim() && (
                  <div className="border-t border-gray-100">
                    <SearchResultsList query={query} results={results} onPick={pickResult} />
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            to="/contact"
            className="shrink-0 rounded-lg border border-tundora bg-white px-4 py-2.5 font-sans text-sm text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
          >
            Get a Quote
          </Link>
        </nav>

        <div className="flex items-center gap-8 xl:hidden">
          <button
            type="button"
            aria-label="Search"
            onClick={() => {
              setMobileSearchOpen((open) => !open)
              setMenuOpen(false)
            }}
            className="text-tundora"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12.7" y1="12.7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="text-tundora"
            aria-label="Toggle menu"
            onClick={() => {
              setMenuOpen((open) => !open)
              setMobileSearchOpen(false)
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-gray-100 px-6 py-4 xl:hidden">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeMobileSearch()}
              placeholder="Search for something..."
              className="w-full rounded-md border border-gray-200 py-2.5 pr-9 pl-3 font-sans text-sm text-gray-900 outline-none focus:border-royal-blue"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={closeMobileSearch}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-royal-blue"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {query.trim() && (
            <div className="mt-2 overflow-hidden rounded-md border border-gray-100">
              <SearchResultsList query={query} results={results} onPick={mobilePickResult} />
            </div>
          )}
        </div>
      )}

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-gray-100 px-6 py-4 xl:hidden">
          {navLinks.map((link) => (
            <div key={link.label} className="flex flex-col">
              <div className="flex items-center justify-between">
                <Link
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2 font-body text-sm font-bold tracking-widest text-gray-500 uppercase hover:text-royal-blue"
                >
                  {link.label}
                </Link>
                {link.menu && (
                  <button
                    type="button"
                    aria-label={`Toggle ${link.label} submenu`}
                    onClick={() =>
                      setOpenMobileMenu((current) => (current === link.menu ? null : link.menu))
                    }
                    className="p-2 text-gray-400"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      className={`transition-transform duration-200 ${openMobileMenu === link.menu ? 'rotate-180' : ''}`}
                    >
                      <path
                        d="M1 4l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {link.menu && openMobileMenu === link.menu && (
                <div className="flex flex-col gap-1 border-l border-gray-100 py-2 pl-4">
                  {mobileMenuItems[link.menu].map((item) => {
                    const label = typeof item === 'string' ? item : item.label
                    const path = typeof item === 'string' ? link.to : item.path
                    const className = 'py-1.5 font-body text-sm text-gray-500 hover:text-royal-blue'
                    return (
                      <Link
                        key={label}
                        to={path}
                        onClick={() => {
                          setMenuOpen(false)
                          setOpenMobileMenu(null)
                        }}
                        className={className}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          <Link
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-block w-fit rounded-lg border border-tundora bg-white px-5 py-3 font-sans text-sm text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
          >
            Get a Quote
          </Link>
        </nav>
      )}
    </header>
  )
}
