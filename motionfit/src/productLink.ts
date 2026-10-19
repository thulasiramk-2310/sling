// Turns a shared product link (Amazon, Flipkart, or most other stores) into a name, price and photos.
// Pure string work so it runs both in the browser and in the small server that fetches the page.

export type Store = 'amazon' | 'flipkart' | 'myntra' | 'ajio' | 'other'

export interface ProductLink {
  store: Store
  url: string
  // A link straight to a picture rather than a product page.
  image: boolean
}

export interface ProductInfo {
  title: string
  price: number | null
  images: string[]
  store: Store
}

const STORES: [RegExp, Store][] = [
  [/(^|\.)(amazon\.(com|in|ca|de|fr|it|es|nl|se|pl|ae|sa|sg|eg|co\.uk|co\.jp|com\.au|com\.mx|com\.br|com\.tr|com\.be)|amzn\.(in|to|eu|asia)|a\.co)$/, 'amazon'],
  [/(^|\.)(flipkart\.com|fkrt\.(it|cc|co))$/, 'flipkart'],
  [/(^|\.)(myntra\.com|myntr\.it)$/, 'myntra'],
  [/(^|\.)ajio\.(com|me)$/, 'ajio'],
]

export function storeOf(host: string): Store {
  const h = host.toLowerCase()
  return STORES.find(([re]) => re.test(h))?.[1] ?? 'other'
}

// Finds the first web link in pasted text. Share sheets add words around it ("Check this out on Amazon: https://amzn.in/d/…").
export function parseProductLink(text: string): ProductLink | null {
  const m = text.match(/https?:\/\/[^\s<>"'`]+/i) ?? text.match(/\b(?:www\.)?(?:amazon\.[a-z.]+|amzn\.[a-z]+|flipkart\.com|fkrt\.[a-z]+|myntra\.com|ajio\.com)\/[^\s<>"'`]*/i)
  if (!m) return null
  let raw = m[0].replace(/[),.;!?]+$/, '')
  if (!/^https?:/i.test(raw)) raw = 'https://' + raw
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  return { store: storeOf(u.hostname), url: u.href, image: /\.(jpe?g|png|webp|avif)$/i.test(u.pathname) }
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', '#39': "'", '#x27': "'", '#34': '"' }
export function decodeEntities(s: string) {
  return s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (all, e: string) => {
    const k = e.toLowerCase()
    if (k in ENTITIES) return ENTITIES[k]
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16))
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10))
    return all
  })
}

function meta(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return content ? decodeEntities(content).trim() : ''
}

const toPrice = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

interface LdProduct {
  name?: string
  image?: unknown
  offers?: unknown
}

// schema.org Product data, which most large stores embed for search engines.
function ldProduct(html: string): LdProduct | null {
  const blocks = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)
  const find = (node: unknown): LdProduct | null => {
    if (!node || typeof node !== 'object') return null
    if (Array.isArray(node)) {
      for (const n of node) {
        const hit = find(n)
        if (hit) return hit
      }
      return null
    }
    const o = node as Record<string, unknown>
    const type = o['@type']
    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return o as LdProduct
    return find(o['@graph']) ?? null
  }
  for (const b of blocks) {
    try {
      const hit = find(JSON.parse(b[1].trim()))
      if (hit) return hit
    } catch {
      // Malformed blocks are common; the other sources still apply.
    }
  }
  return null
}

function ldImages(v: unknown): string[] {
  if (!v) return []
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(ldImages)
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return ldImages(o.url ?? o.contentUrl)
  }
  return []
}

function ldPrice(v: unknown): number | null {
  if (!v) return null
  if (Array.isArray(v)) return ldPrice(v[0])
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return toPrice(o.price ?? o.lowPrice)
  }
  return null
}

// Product photos come in many sizes; ask for a large one so the garment stays sharp on screen.
export function upgradeImage(url: string) {
  return url
    .replace(/(rukminim\d*\.flixcart\.com\/image\/)\d+\/\d+\//, '$1832/832/')
    .replace(/(m\.media-amazon\.com\/images\/I\/[^.]+)\.[^/]*?\.(jpg|png|webp)$/i, '$1.$2')
}

function cleanTitle(t: string) {
  return decodeEntities(t)
    .replace(/^Amazon\.[a-z.]+\s*:\s*/i, '')
    .replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, '')
    .replace(/^Buy\s+/i, '')
    .replace(/\s+(Online at Best Prices? in India|Online at Low Prices? in India|Online in India)[\s\S]*$/i, '')
    .replace(/\s*[|–-]\s*(Flipkart\.com|Myntra|AJIO)[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractProduct(html: string, pageUrl: string): ProductInfo {
  const base = new URL(pageUrl)
  const store = storeOf(base.hostname)
  const ld = ldProduct(html)
  const images: string[] = []
  const push = (raw: string | undefined) => {
    if (!raw) return
    try {
      const u = new URL(decodeEntities(raw).replace(/\\\//g, '/'), base)
      if (u.protocol === 'https:' || u.protocol === 'http:') images.push(upgradeImage(u.href))
    } catch {
      // Not a usable address.
    }
  }

  if (store === 'amazon') {
    // The gallery script lists every colour's photos at full resolution.
    for (const m of html.matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/g)) push(m[1])
    push(html.match(/data-old-hires=["'](https:[^"']+)["']/)?.[1])
    const dyn = html.match(/data-a-dynamic-image=["']([^"']+)["']/)?.[1]
    if (dyn) {
      try {
        const sizes = JSON.parse(decodeEntities(dyn)) as Record<string, [number, number]>
        const best = Object.entries(sizes).sort((a, b) => b[1][0] * b[1][1] - a[1][0] * a[1][1])[0]
        push(best?.[0])
      } catch {
        // Fall through to the other sources.
      }
    }
  }
  if (store === 'flipkart') for (const m of html.matchAll(/https:\/\/rukminim\d*\.flixcart\.com\/image\/\d+\/\d+\/[^"'\s?\\)]+/g)) push(m[0])
  ldImages(ld?.image).forEach(push)
  push(meta(html, 'og:image'))
  push(meta(html, 'og:image:secure_url'))
  push(meta(html, 'twitter:image'))

  const title =
    cleanTitle(html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '') ||
    cleanTitle(ld?.name ?? '') ||
    cleanTitle(meta(html, 'og:title')) ||
    cleanTitle(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')

  const price =
    ldPrice(ld?.offers) ??
    toPrice(meta(html, 'product:price:amount')) ??
    toPrice(html.match(/class=["']a-price-whole["'][^>]*>([\d,]+)/)?.[1]) ??
    (store === 'flipkart' ? toPrice(html.match(/₹\s?([\d,]{2,9})/)?.[1]) : null)

  // Drop icons, sprites and tiny thumbnails that some pages list alongside the real photos.
  const unique = [...new Set(images)].filter((u) => !/sprite|logo|icon|placeholder|transparent-pixel|\.gif($|\?)|\.svg($|\?)/i.test(u))
  return { title: title.slice(0, 120), price, images: unique.slice(0, 10), store }
}

export type Category = 'Tees' | 'Shirts' | 'Jackets' | 'Knitwear'

// Reads the garment type and sleeve length from a product title.
export function guessGarment(title: string): { category: Category; sleeves: 'short' | 'long'; wearable: boolean } {
  const t = title.toLowerCase()
  let category: Category = 'Tees'
  if (/\b(jacket|blazer|coat|bomber|windcheater|shacket|gilet|parka)\b/.test(t)) category = 'Jackets'
  else if (/\b(sweater|cardigan|pullover|jumper|sweatshirt|hoodie|hooded|knit)\b/.test(t)) category = 'Knitwear'
  else if (/\b(shirt|kurta|kurti|blouse|tunic)\b/.test(t) && !/\b(t-?shirt|tee)\b/.test(t)) category = 'Shirts'
  let sleeves: 'short' | 'long' = category === 'Tees' ? 'short' : 'long'
  if (/\b(full|long)[\s-]?sleeves?\b|\b3\/4\b/.test(t)) sleeves = 'long'
  else if (/\b(half|short|cap)[\s-]?sleeves?\b|\bsleeveless\b/.test(t)) sleeves = 'short'
  const wearable = !/\b(jeans|trousers|pants|shorts|skirt|leggings|shoes?|sneakers?|sandals?|watch|bag|saree|lehenga|dress)\b/.test(t) || /\b(shirt|tee|top|jacket|hoodie|sweater|kurta)\b/.test(t)
  return { category, sleeves, wearable }
}

// Shopify stores (most Indian D2C brands) publish every product as JSON at /products/<handle>.json.
export function shopifyJsonUrl(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl)
    const m = u.pathname.match(/^(?:\/[a-z]{2}(?:-[a-z]{2})?)?(?:\/collections\/[^/]+)?\/products\/([^/.?#]+)/i)
    return m ? `${u.origin}/products/${m[1]}.json` : null
  } catch {
    return null
  }
}

export function fromShopifyJson(raw: unknown): ProductInfo | null {
  const p = (raw as { product?: { title?: unknown; images?: unknown; variants?: unknown } } | null)?.product
  if (!p || typeof p.title !== 'string') return null
  const images = (Array.isArray(p.images) ? p.images : [])
    .map((i) => (i && typeof i === 'object' ? (i as { src?: unknown }).src : null))
    .filter((s): s is string => typeof s === 'string' && /^https?:\/\//.test(s))
  const v = Array.isArray(p.variants) ? (p.variants[0] as { price?: unknown } | undefined) : undefined
  const price = v ? toPrice(v.price) : null
  if (!images.length) return null
  return { title: cleanTitle(p.title).slice(0, 120), price, images: images.slice(0, 10), store: 'other' }
}
