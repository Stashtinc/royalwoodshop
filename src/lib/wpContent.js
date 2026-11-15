/**
 * Turns WordPress export leftovers in article HTML into real markup.
 *
 * - `[caption id=".." align="alignright" width="200"]<img ...> Text[/caption]`
 *   becomes a <figure> that keeps the image and the caption text, with the
 *   alignment and width from the shortcode.
 * - `[gallery ...]` has no equivalent here, so the tag is dropped rather than
 *   shown to readers as code.
 */
export function cleanWpContent(html = '') {
  return String(html)
    .replace(
      /\[caption\b([^\]]*)\]([\s\S]*?)\[\/caption\]/gi,
      (_, attrs, inner) => {
        const align = (attrs.match(/align="([^"]*)"/i) || [])[1] || 'alignnone'
        const width = (attrs.match(/width="(\d+)"/i) || [])[1]
        const m = inner.match(/^([\s\S]*?<img\b[^>]*>)\s*([\s\S]*)$/i)
        const img = m ? m[1] : ''
        const text = (m ? m[2] : inner).trim()
        const style = width ? ` style="width:${width}px"` : ''
        const caption = text ? `<figcaption>${text}</figcaption>` : ''
        return `<figure class="wp-caption ${align}"${style}>${img}${caption}</figure>`
      },
    )
    .replace(/\[gallery\b[^\]]*\]/gi, '')
}
