import { useEffect, useRef } from 'react'
import showroomImg from '../assets/images/showroom-banner.jpg'

export default function ShowroomBanner() {
  const sectionRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    function onScroll() {
      const section = sectionRef.current
      const img = imgRef.current
      if (!section || !img) return
      const offset = -section.getBoundingClientRect().top * 0.35
      img.style.transform = `translateY(${offset}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section ref={sectionRef} className="relative flex w-full items-center justify-center overflow-hidden py-10 lg:py-24">
      <img
        ref={imgRef}
        src={showroomImg}
        alt="The Royal Wood Shop showroom in East Gwillimbury"
        className="absolute inset-x-0 w-full object-cover"
        style={{ top: '-15%', height: '130%' }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative mx-auto flex max-w-[783px] flex-col items-center gap-10 px-6 text-center">
        <div className="flex flex-col gap-5">
          <h2 className="font-serif text-3xl font-bold text-white lg:text-[36px]">
            Visit Our Showroom in East Gwillimbury
          </h2>
          <p className="font-sans text-xl font-medium text-white">
            Visit our GTA/York Region showroom, where you&rsquo;ll find over one million feet
            of millwork and woodworking products in stock and a friendly, knowledgeable team
            ready to help.
          </p>
        </div>

        <a
          href="#visit"
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-royal-blue bg-royal-blue px-4 py-4 font-sans text-base text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="3" width="13" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4.5 1.5v3M11.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Plan Your Visit
        </a>
      </div>
    </section>
  )
}
