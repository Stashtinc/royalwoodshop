import { Link } from 'react-router'

const products = [
  {
    id: 'v-groove',
    name: 'V-Groove',
    description:
      'V-groove panelling features narrow V-shaped seams that create subtle shadow lines for a clean, tailored look. Ideal for walls and ceilings in modern and traditional interiors alike.',
    image: '/uploads/panelling/v-groove-ceiling.jpg',
  },
  {
    id: 'shiplap',
    name: 'Shiplap',
    description:
      'Installed horizontally or vertically, shiplap creates clean, even lines — bringing a relaxed, timeless look to interiors often associated with coastal, farmhouse, and modern rustic styles.',
    image: '/uploads/panelling/shiplap.jpg',
  },
  {
    id: 'beadboard',
    name: 'Beadboard',
    description:
      'Narrow vertical boards divided by small, rounded beads give beadboard its classic cottage character — adding warmth and a sense of handcrafted detail to any wall or wainscoting application.',
    image: '/uploads/panelling/beadboard.jpg',
  },
  {
    id: 'applied-moulding',
    name: 'Applied Moulding',
    description:
      'Adding moulding directly to drywall creates a refined, custom high-end look while keeping installation simple and flexible — the fastest way to elevate a plain wall.',
    image: '/uploads/panelling/applied-moulding.jpg',
  },
  {
    id: 'pre-finished',
    name: 'Pre-Finished',
    description:
      'Beautiful and durable pre-finished wall & ceiling panelling in Knotty Pine SPF. Available in 10 unique colours on traditional V-groove and Shiplap profiles in 1×6 and 1×8. Kiln dried, tongue and grooved, and end matched for easy installation — suitable for interior walls, ceilings, soffits, and covered porches.',
    image: '/uploads/panelling/pre-finished.jpg',
  },
  {
    id: 'acoustic-panel',
    name: 'Acoustic Panel',
    description:
      'Acoustic panels improve sound quality in home offices, media rooms, and open-concept areas while adding warmth, texture, and modern architectural detail. Available in a variety of wood tones and finishes.',
    image: '/uploads/panelling/acoustic-panel.jpg',
  },
]

export default function PannellingSurfaces() {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-24">
        <div className="mx-auto flex max-w-[1147px] flex-col gap-6 px-6 lg:px-8">
          <p className="font-sans text-xs font-bold tracking-wide text-royal-blue uppercase">
            Wall &amp; Ceiling
          </p>
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            Panelling Surfaces
          </h1>
          <p className="max-w-[700px] font-sans text-lg leading-relaxed text-gray-600">
            Enhance your interior with wall and ceiling panelling solutions for every design
            aesthetic. Our panelling options deliver exceptional durability and a refined finished
            look — in stock and available for pickup or delivery across the GTA.
          </p>
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-[#fbfbfb] transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="h-52 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <p className="font-serif text-lg font-bold text-[#24140d]">{product.name}</p>
                  <p className="font-sans text-sm leading-relaxed text-gray-600">
                    {product.description}
                  </p>
                  <div className="mt-auto pt-4">
                    <Link
                      to="/products/trim-mouldings?sub=Tongue+%26+Groove"
                      className="font-sans text-sm font-medium text-royal-blue transition-colors hover:text-royal-blue-dark"
                    >
                      View Profiles &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-parchment py-14 lg:py-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-6 text-center lg:px-8">
          <h2 className="font-serif text-2xl font-bold text-royal-blue lg:text-[30px]">
            Not sure which panelling is right for your project?
          </h2>
          <p className="max-w-[560px] font-sans text-base text-gray-600">
            Bring your plans and ideas to our showroom — our team can help you choose the right
            profile, finish, and quantity for any wall or ceiling application.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="rounded-lg border border-royal-blue bg-royal-blue px-6 py-3 font-sans text-base font-medium text-white transition-colors hover:border-royal-blue-dark hover:bg-royal-blue-dark"
            >
              Visit the Showroom
            </Link>
            <Link
              to="/products/trim-mouldings?sub=Tongue+%26+Groove"
              className="rounded-lg border border-royal-blue px-6 py-3 font-sans text-base font-medium text-royal-blue transition-colors hover:bg-royal-blue hover:text-white"
            >
              Browse All Panelling
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
