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
  route('resources', 'routes/resources.jsx'),
  route('quotation', 'routes/quotation.jsx'),

  // Admin. Never prerendered — it runs on the server that holds the database.
  route('admin/login', 'routes/admin/login.jsx'),
  route('admin/logout', 'routes/admin/logout.js'),
  route('admin', 'routes/admin/layout.jsx', [
    index('routes/admin/dashboard.jsx'),
    route('products', 'routes/admin/products.jsx'),
    route('products/:id', 'routes/admin/product-edit.jsx'),
  ]),

  route('404', 'routes/not-found.jsx'),

  route('sitemap.xml', 'routes/sitemap.js'),
  route('robots.txt', 'routes/robots.js'),
]
