import { Link } from 'react-router'
import { productCategories } from '../data/productCategories'

export default function ProductsGrid() {
  return (
    <section id="products" className="w-full bg-[#fbfbfb] py-10 lg:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-14 px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">
            Explore our Products Range
          </h2>
          <p className="font-sans text-lg text-gray-600">
            From trim and mouldings to custom millwork — everything you need for your next build or
            renovation.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {productCategories.map((category) => (
            <div
              key={category.name}
              className="group relative flex aspect-[2/3] items-end overflow-hidden rounded-2xl border-b-[8px] border-royal-blue p-4 transition-shadow duration-300 hover:shadow-xl sm:rounded-[36px] sm:border-b-[15px] sm:p-7"
            >
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 from-50% to-black/80 transition-opacity duration-300 group-hover:opacity-0" />
              <p className="relative font-serif text-base font-medium text-white transition-opacity duration-300 group-hover:opacity-0 sm:text-2xl">
                {category.name}
              </p>

              <div className="absolute inset-0 flex flex-col justify-between bg-royal-blue px-4 pt-4 pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:px-7 sm:pt-7 sm:pb-4">
                <div className="flex flex-col gap-2 sm:gap-4">
                  <h3 className="font-serif text-lg leading-tight font-medium text-white sm:text-3xl">
                    {category.name}
                  </h3>
                  <p className="font-sans text-xs text-white/90 sm:text-base">{category.description}</p>
                </div>
                <Link
                  to="/products"
                  className="block text-right font-sans text-xs text-white sm:text-base"
                >
                  View more <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
