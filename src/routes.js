import { index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.jsx'),

  // Catalogue. Sub-category is deliberately not in the path — it is the
  // volatile part of the taxonomy and belongs in a facet. See spec §2.2.
  route('products', 'routes/catalogue.jsx'),
  route('products/:category', 'routes/category.jsx'),
  route('products/:category/:slug', 'routes/product.jsx'),

  route('contact', 'routes/contact.jsx'),
  route('the-royal-edge', 'routes/royal-edge.jsx'),
  route('core-values', 'routes/core-values.jsx'),
  route('environmental-commitment', 'routes/environmental.jsx'),
  route('services', 'routes/services.jsx'),
  // Service pages keep the addresses WordPress used, so the pages that already
  // rank keep ranking. These must be declared before the ':slug' article
  // catch-all at the bottom, or an article route would swallow them.
  route('consultation', 'routes/service-consultation.jsx'),
  route('material-estimate-and-quotation', 'routes/service-material-estimate-and-quotation.jsx'),
  route('services/delivery', 'routes/service-delivery.jsx'),
  route('saw-blade-sharpening', 'routes/service-saw-blade-sharpening.jsx'),
  route('resources', 'routes/resources.jsx'),
  route('resources/downloads', 'routes/downloads.jsx'),
  route('resources/glossary', 'routes/glossary.jsx'),
  route('resources/faq', 'routes/faq.jsx'),
  route('resources/installation-tips', 'routes/installation-tips.jsx'),
  route('workorder', 'routes/quotation.jsx'),

  // Admin. Never prerendered — it runs on the server that holds the database.
  route('admin/login', 'routes/admin/login.jsx'),
  route('admin/logout', 'routes/admin/logout.js'),
  route('admin', 'routes/admin/layout.jsx', [
    index('routes/admin/dashboard.jsx'),
    route('products', 'routes/admin/products.jsx'),
    route('products/new', 'routes/admin/product-new.jsx'),
    route('products/:id', 'routes/admin/product-edit.jsx'),
    route('logs', 'routes/admin/logs.jsx'),
    route('posts', 'routes/admin/posts.jsx'),
    route('posts/:id', 'routes/admin/post-edit.jsx'),
    route('import', 'routes/admin/import.jsx'),
  ]),

  route('blog', 'routes/journal.jsx'),

  route('404', 'routes/not-found.jsx'),

  route('sitemap.xml', 'routes/sitemap.js'),
  route('robots.txt', 'routes/robots.js'),

  // Articles keep the addresses WordPress used — royalwoodshop.com/what-is-
  // wainscoting — because they are the best-ranking pages on the site.
  // Declared last so every real route is matched first.
  route(':slug', 'routes/article.jsx'),
]
