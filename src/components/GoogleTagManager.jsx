/**
 * Google Tag Manager, which carries GA4 (and Hotjar) for the public site.
 *
 * One container: GTM-TW6NDWG, the one that holds the old site's GA4 tags. The
 * old site also loaded GTM-KRF8FQJC, which is empty, so it is not carried
 * over. The ID comes from VITE_GTM_ID, read at build time: set it on the
 * production Railway service only and redeploy. Without it nothing loads, so
 * local builds and any other deploy send no traffic to Analytics.
 *
 * Rendered by the public layout only; visits to the admin are not traffic.
 */
const id = import.meta.env.VITE_GTM_ID
const GTM_ID = /^GTM-[A-Z0-9]+$/.test(id ?? '') ? id : null

const loader = (containerId) =>
  "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
  "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;" +
  "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
  `})(window,document,'script','dataLayer','${containerId}');`

export default function GoogleTagManager() {
  if (!GTM_ID) return null
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: loader(GTM_ID) }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} title="Google Tag Manager"
        />
      </noscript>
    </>
  )
}
