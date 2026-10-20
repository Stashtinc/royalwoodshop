import { thumbSrc, imageFit } from '../../lib/images'

/** A small product image, sized the same way the catalogue cards size theirs.
 *  A plain grey square when a product has no image. */
export default function Thumb({ product, size = 44 }) {
  const style = { width: size, height: size }
  if (!product.image) {
    return <span style={style} className="shrink-0 rounded-md bg-gray-100" aria-hidden="true" />
  }
  const fit = imageFit(product.imageRole)
  return (
    <span style={style} className={`shrink-0 overflow-hidden rounded-md border border-gray-100 bg-white ${fit.pad ? 'p-0.5' : ''}`}>
      <img
        src={thumbSrc(product.image, product.imageWidth)}
        alt=""
        loading="lazy"
        decoding="async"
        className={`h-full w-full ${fit.className}`}
      />
    </span>
  )
}
