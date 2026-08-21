/**
 * The files offered on /resources/downloads.
 *
 * Descriptions are Royal Wood Shop's own words, taken from the pages these
 * files currently sit behind on royalwoodshop.com. Not reworded.
 *
 * HOSTING — read before launch.
 * `href` still points at the WordPress uploads folder, because that is where
 * these PDFs live today and it means the page works right now. The moment the
 * WordPress site is switched off, both links die.
 *
 * Before launch, drop the two PDFs into `public/downloads/` under the
 * filenames given in `localFile` below, then change each `href` to
 * `/downloads/<localFile>`. Nothing else needs to change.
 */

export const downloads = [
  {
    slug: 'royal-woodworking-brochure',
    title: 'Royal Woodworking Brochure',
    description:
      'Royal Woodworking has been a manufacturer and distributor of solid wood products since 1976, providing quality products throughout North America. Now located in Alexandria, Ontario, Royal Woodworking is an upscale addition to Alexandria Moulding’s wide array of products.',
    format: 'PDF',
    href: 'https://www.royalwoodshop.com/wp-content/uploads/2023/10/Alex-East-and-Royal-Woodworking_ProductCatalog.pdf',
    localFile: 'royal-woodworking-brochure.pdf',
  },
  {
    slug: 'alexandria-east-product-catalogue',
    title: 'Alexandria East Product Catalogue',
    description:
      'The Quick Ship range from Alexandria Moulding — profiles held in stock for fast turnaround. Worth a look before ordering a special run.',
    format: 'PDF',
    href: 'https://www.royalwoodshop.com/wp-content/uploads/2024/04/ALXE_ProductCatalog_VF_09062019_compressed.pdf',
    localFile: 'alexandria-east-product-catalogue.pdf',
  },
]
