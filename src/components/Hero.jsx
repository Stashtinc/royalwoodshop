import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/images/logo.svg'
import heroLeft from '../assets/images/hero-left.png'
import heroRight from '../assets/images/hero-right.jpg'
import heroShiplap from '../assets/images/hero-shiplap.jpg'
import NavDropdownPanel from './NavDropdownPanel'
import SearchResultsList from './SearchResultsList'
import useSiteSearch from '../hooks/useSiteSearch'

const TEXTURE_WIDTH = 191
const PANEL_WIDTH = 612
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

function HeroPanelContent({ showLogo = true }) {
  return (
    <div className="flex flex-col items-center gap-12 xl:gap-16">
      {showLogo && (
        <img src={logo} alt="The Royal Wood Shop" className="h-auto w-[240px] xl:w-[260px]" />
      )}
      <div className="flex w-full flex-col items-start gap-9">
        <h1 className="font-serif text-3xl leading-[1.5] font-bold text-white xl:text-[36px] xl:whitespace-nowrap">
          Built for Professionals.
          <br />
          Trusted by Homeowners.
        </h1>
        <a
          href="#about"
          className="group inline-flex w-fit items-center gap-2 rounded-lg border border-white px-4 py-4 font-sans text-base text-white transition-colors hover:bg-white hover:text-royal-blue"
        >
          Learn more
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path
              d="M1 8h14M9 2l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}

function ProductHotspot({ left, top, name, partNo, price, popoverSide = 'left' }) {
  const popoverPositionClass =
    popoverSide === 'bottom'
      ? 'top-0 left-0 mt-5 -translate-x-1/2'
      : 'top-0 right-full mr-4 -translate-y-1/2'
  const arrowPositionClass =
    popoverSide === 'bottom'
      ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2'
      : 'top-1/2 left-full -translate-x-1/2 -translate-y-1/2'

  return (
    <div className="group absolute z-20 hidden xl:block" style={{ left, top }}>
      <button
        type="button"
        aria-label={`View ${name} product details`}
        className="relative flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        <span className="absolute h-full w-full animate-ping rounded-full bg-black/40" />
        <span className="relative h-4 w-4 rounded-full bg-white" />
      </button>

      <div
        className={`pointer-events-none absolute w-64 rounded-xl bg-white p-4 opacity-0 shadow-2xl transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 ${popoverPositionClass}`}
      >
        <p className="font-serif text-base font-bold text-[#24140d]">{name}</p>
        <p className="mt-1 font-sans text-xs text-gray-500">Part No. {partNo}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-sans text-sm font-medium text-royal-blue">{price}</span>
          <Link
            to="/products"
            className="rounded-md border border-royal-blue px-3 py-1.5 font-sans text-xs text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
          >
            View
          </Link>
        </div>
        <div className={`absolute h-3 w-3 rotate-45 bg-white ${arrowPositionClass}`} />
      </div>
    </div>
  )
}

const heroSlides = [
  {
    image: heroRight,
    alt: "Interior staircase showcasing The Royal Wood Shop's millwork",
    hotspots: [
      { left: '68%', top: '38%', name: 'Wall & Ceiling Panelling', partNo: 'WP-2400', price: 'From $18.50/sq ft' },
      {
        left: '78%',
        top: '7%',
        name: 'Crown Moulding',
        partNo: 'CM-3050',
        price: 'From $4.75/lin ft',
        popoverSide: 'bottom',
      },
    ],
  },
  {
    image: heroShiplap,
    alt: 'Living room with shiplap ceiling and beam millwork from The Royal Wood Shop',
    hotspots: [
      {
        left: '46%',
        top: '12%',
        name: 'Shiplap Wall & Ceiling Panel',
        partNo: 'WP-5512',
        price: 'From $5.75/sq ft',
        popoverSide: 'bottom',
      },
      {
        left: '45%',
        top: '63%',
        name: 'Rustic Mantel Beam',
        partNo: 'BM-4800',
        price: 'From $28.00/lin ft',
      },
    ],
  },
]

const HERO_SLIDE_INTERVAL_MS = 14000

function HeroPhoto() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroSlides.length)
    }, HERO_SLIDE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {heroSlides.map((slide, i) => (
        <div
          key={slide.image}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            i === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.alt}
            className="animate-kenburns absolute inset-0 h-full w-full object-cover"
          />
          {slide.hotspots.map((hotspot) => (
            <ProductHotspot key={hotspot.partNo} {...hotspot} />
          ))}
        </div>
      ))}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(102,102,102,0) 32%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </>
  )
}

export default function Hero() {
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
    <section className="relative w-full">
      {/* Mobile / tablet: simple stacked layout (desktop nav is embedded below since it's tied to the blue panel's width).
          Uses xl, not lg, because the embedded nav needs ~1500px of room to avoid crowding — below that, Header's
          hamburger menu takes over instead. */}
      <div className="flex w-full flex-col xl:hidden">
        <div
          className="h-20 w-full bg-cover bg-center sm:h-24"
          style={{ backgroundImage: `url(${heroLeft})` }}
          aria-hidden="true"
        />
        <div className="flex flex-col items-center bg-royal-blue px-8 pt-12 pb-16">
          <HeroPanelContent showLogo={false} />
        </div>
        <div className="relative min-h-[320px] w-full overflow-hidden">
          <HeroPhoto />
        </div>
      </div>

      {/* Desktop: texture/blue panel/search stay pinned to the true left edge (matching Figma); the photo is the
          only element that stretches, absorbing all extra width on wide viewports. Nothing here is centered. */}
      <div className="relative hidden w-full xl:block xl:min-h-[860px]">
        <div className="absolute inset-0 flex">
          <div className="flex shrink-0 flex-col" style={{ width: `${TEXTURE_WIDTH}px` }}>
            <div className="h-[90px] shrink-0 bg-white" />
            <div
              className="flex-1 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroLeft})` }}
              aria-hidden="true"
            />
          </div>
          <div className="shrink-0 bg-royal-blue" style={{ width: `${PANEL_WIDTH}px` }} />
          <div className="flex flex-1 flex-col">
            <div className="h-[90px] shrink-0 bg-white" />
            <div className="relative flex-1 overflow-hidden">
              <HeroPhoto />
            </div>
          </div>
        </div>

        <div ref={searchRef} className="relative z-30 flex h-full w-full">
          <div className="shrink-0" style={{ width: `${TEXTURE_WIDTH}px` }}>
            <div className="flex h-[90px] shrink-0 items-center justify-end text-tundora/70">
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
            className="relative flex shrink-0 flex-col items-center justify-start px-16 pt-[190px] pb-16"
            style={{ width: `${PANEL_WIDTH}px` }}
          >
            {searchOpen && (
              <div className="absolute top-0 left-0 z-30 w-full">
                <div className="flex h-[90px] w-full items-center gap-4 border-l border-white/30 bg-royal-blue-dark px-6">
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
            <HeroPanelContent />
          </div>

          <div className="flex flex-1 flex-col">
            <div
              className="flex h-[90px] shrink-0 items-center gap-6 pr-6"
              style={{ maxWidth: `${NAV_ROW_MAX_WIDTH}px` }}
            >
              <nav className="relative flex h-full flex-1 items-center">
                {navLinks.map((link) => (
                  <div key={link.label} className="group/item h-full flex-1">
                    <Link
                      to={link.to}
                      className="flex h-full w-full items-center justify-center border-b-4 border-transparent px-4 font-body text-xs font-bold tracking-wide whitespace-nowrap text-gray-500 uppercase transition-colors hover:border-royal-blue hover:bg-parchment hover:text-royal-blue"
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
    </section>
  )
}
