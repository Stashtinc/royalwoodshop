import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './components/Header'
import PageHeader from './components/PageHeader'
import Footer from './components/Footer'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Catalogue from './pages/Catalogue'
import Placeholder from './pages/Placeholder'
import WhatMakesUsDifferent from './pages/WhatMakesUsDifferent'
import CoreValues from './pages/CoreValues'
import EnvironmentalCommitment from './pages/EnvironmentalCommitment'
import ProductDetail from './pages/ProductDetail'
import Quotation from './pages/Quotation'
import royalEdgeHero from './assets/images/royal-edge-hero.jpg'
import servicesHero from './assets/images/services-hero.jpg'

const pageHeaderImages = {
  '/the-royal-edge': { image: royalEdgeHero, imageAlt: 'Close-up of custom oak moulding profiles' },
  '/services': { image: servicesHero, imageAlt: 'Modern oak staircase with black metal balusters' },
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function App() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isQuotation = pathname === '/quotation'

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isQuotation && <Header />}
      {!isHome && !isQuotation && <PageHeader {...pageHeaderImages[pathname]} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trim-doors-catalogue" element={<Catalogue />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/the-royal-edge" element={<WhatMakesUsDifferent />} />
        <Route path="/core-values" element={<CoreValues />} />
        <Route path="/environmental-commitment" element={<EnvironmentalCommitment />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/services" element={<Placeholder title="Services" />} />
        <Route path="/resources" element={<Placeholder title="Resources" />} />
        <Route path="/quotation" element={<Quotation />} />
      </Routes>
      {!isQuotation && <Footer />}
    </div>
  )
}

export default App
