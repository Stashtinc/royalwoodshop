export default function Placeholder({ title }) {
  return (
    <section className="flex w-full flex-1 flex-col items-center justify-center gap-4 bg-[#fbfbfb] px-6 py-24 text-center">
      <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">{title}</h1>
      <p className="font-sans text-lg text-gray-600">This page is coming soon.</p>
    </section>
  )
}
