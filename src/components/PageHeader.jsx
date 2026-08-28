import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/images/logo.svg'
import heroLeft from '../assets/images/hero-left.png'
import heroRight from '../assets/images/header-doors.jpg'
import NavDropdownPanel from './NavDropdownPanel'
import SearchResultsList from './SearchResultsList'
import useSiteSearch from '../hooks/useSiteSearch'

const TEXTURE_WIDTH = 191
const PANEL_WIDTH = 612
const NAV_ROW_HEIGHT = 90
const PHOTO_STRIP_HEIGHT = 170
const NAV_ROW_MAX_WIDTH = 820

const navLinks = [
  { label: 'Products', to: '/products', menu: 'products' },
  { label: 'Services', to: '/services', menu: 'services' },
  { label: 'About Royal', to: '/#about', menu: 'about' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Resources', to: '/resources', menu: 'resources' },
]

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12.7" y1="12.7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Compact hero-style banner used at the top of interior pages (Contact, Services, Resources) —
// same texture/blue-panel/photo language as the homepage Hero, just shorter, with the logo only
// (no headline). Desktop only; mobile keeps Header's plain sticky bar.
export default function PageHeader({ image = heroRight, imageAlt = 'Interior staircase showcasing The Royal Wood Shop’s millwork' }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState(null)
  const { query, setQuery, results } = useSiteSearch()
  const searchRef = useRef(null)
  const navigate = useNavigate()

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setQuery('')
    setSelectedResult(null)
  }, [setQuery])

  function pickResult(result) {
    navigate(result.path)
    closeSearch()
  }

  function submitResult() {
    if (!selectedResult) return
    navigate(selectedResult.path)
    closeSearch()
  }

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

  return (
    <div
      className="relative hidden w-full xl:block"
      style={{ height: `${NAV_ROW_HEIGHT + PHOTO_STRIP_HEIGHT}px` }}
    >
      <div className="absolute inset-0 flex">
        <div className="flex shrink-0 flex-col" style={{ width: `${TEXTURE_WIDTH}px` }}>
          <div className="shrink-0 bg-white" style={{ height: `${NAV_ROW_HEIGHT}px` }} />
          <div
            className="flex-1 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroLeft})` }}
            aria-hidden="true"
          />
        </div>
        <div className="shrink-0 bg-royal-blue" style={{ width: `${PANEL_WIDTH}px` }} />
        <div className="flex flex-1 flex-col">
          <div className="shrink-0 bg-white" style={{ height: `${NAV_ROW_HEIGHT}px` }} />
          <div className="relative flex-1 overflow-hidden">
            <img
              src={image}
              alt={imageAlt}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(180deg, rgba(102,102,102,0) 32%, rgba(0,0,0,0.5) 100%)',
              }}
            />
          </div>
        </div>
      </div>

      <div ref={searchRef} className="relative z-10 flex h-full w-full">
        <div className="shrink-0" style={{ width: `${TEXTURE_WIDTH}px` }}>
          <div
            className="flex shrink-0 items-center justify-end text-tundora/70"
            style={{ height: `${NAV_ROW_HEIGHT}px` }}
          >
            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                if (searchOpen) closeSearch()
                else setSearchOpen(true)
              }}
              className={`flex h-full items-center justify-center border-b-4 px-6 transition-colors hover:border-royal-blue hover:bg-parchment hover:text-royal-blue ${
                searchOpen ? 'border-royal-blue bg-parchment text-royal-blue' : 'border-transparent'
              }`}
            >
              <SearchIcon />
            </button>
          </div>
        </div>

        <div
          className="relative flex shrink-0 flex-col items-center justify-center"
          style={{ width: `${PANEL_WIDTH}px`, paddingTop: `${NAV_ROW_HEIGHT}px` }}
        >
          {searchOpen && (
            <div className="absolute top-0 left-0 z-30 w-full">
              <div
                className="flex w-full items-center gap-4 border-l border-white/30 bg-royal-blue-dark px-6"
                style={{ height: `${NAV_ROW_HEIGHT}px` }}
              >
                {selectedResult ? (
                  <>
                    <div className="flex flex-1 items-center gap-2 overflow-hidden">
                      <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full bg-white/15 px-4 py-2 font-sans text-sm text-white">
                        <span className="truncate">{selectedResult.label}</span>
                        <button
                          type="button"
                          aria-label="Remove selection"
                          onClick={() => setSelectedResult(null)}
                          className="shrink-0 text-white/70 transition-colors hover:text-white"
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Go to result"
                      onClick={submitResult}
                      className="shrink-0 rounded-full bg-white p-2 text-royal-blue transition-colors hover:bg-white/90"
                    >
                      <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M2 7h10M8 3l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for something..."
                    onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                    className="w-full bg-transparent font-sans text-base text-white placeholder-white/70 outline-none"
                  />
                )}
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={closeSearch}
                  className="shrink-0 text-white/70 transition-colors hover:text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {!selectedResult && query.trim() && (
                <div className="w-full overflow-hidden bg-white shadow-2xl">
                  <SearchResultsList query={query} results={results} onPick={pickResult} />
                </div>
              )}
            </div>
          )}
          <Link to="/">
            <img src={logo} alt="The Royal Wood Shop" className="h-auto w-[200px]" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col">
          <div
            className="relative flex shrink-0 items-center gap-6 pr-6"
            style={{ height: `${NAV_ROW_HEIGHT}px`, maxWidth: `${NAV_ROW_MAX_WIDTH}px` }}
          >
            <nav className="relative flex h-full flex-1 items-center justify-evenly">
              {navLinks.map((link) => (
                <div key={link.label} className="group/item h-full">
                  <Link
                    to={link.to}
                    className="flex h-full items-center justify-center border-b-4 border-transparent px-4 font-body text-xs font-bold tracking-wide whitespace-nowrap text-gray-500 uppercase transition-colors hover:border-royal-blue hover:bg-parchment hover:text-royal-blue"
                  >
                    {link.label}
                  </Link>
                  {link.menu && (
                    <div className="invisible absolute top-full left-0 z-30 opacity-0 transition-all duration-150 group-hover/item:visible group-hover/item:opacity-100">
                      <NavDropdownPanel menu={link.menu} />
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <Link
              to="/contact"
              className="shrink-0 rounded-lg border border-tundora bg-white px-4 py-2.5 font-sans text-sm whitespace-nowrap text-gray-900 transition-colors hover:border-royal-blue hover:bg-royal-blue hover:text-white"
            >
              Get a Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
