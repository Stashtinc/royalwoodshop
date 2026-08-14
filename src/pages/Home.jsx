import { useEffect } from 'react'
import { useLocation } from 'react-router'
import Hero from '../components/Hero'
import AboutUs from '../components/AboutUs'
import ProductsGrid from '../components/ProductsGrid'
import ShowroomBanner from '../components/ShowroomBanner'
import Journal from '../components/Journal'

export default function Home() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const el = document.querySelector(hash)
    el?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <>
      <Hero />
      <AboutUs />
      <ProductsGrid />
      <ShowroomBanner />
      <Journal />
    </>
  )
}
