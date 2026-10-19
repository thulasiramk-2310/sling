// Small same-origin API for product links. Browsers can't read another store's page or pixels (CORS),
// so the dev/preview server fetches the shared page, pulls out the photos, and relays the chosen image.
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { extractProduct, fromShopifyJson, parseProductLink, shopifyJsonUrl } from '../src/productLink.ts'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const PAGE_MAX = 8 * 1024 * 1024
const IMAGE_MAX = 12 * 1024 * 1024
const TIMEOUT_MS = 12000

// Addresses that must never be fetched on a visitor's behalf: loopback, private networks, link-local, multicast.
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  }
  if (v === 6) {
    const s = ip.toLowerCase()
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff')
  }
  return true
}

async function assertPublic(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ApiError(400, 'unsupported')
  if (url.port && url.port !== '443' && url.port !== '80') throw new ApiError(400, 'unsupported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (!addrs.length) throw new ApiError(502, 'unreachable')
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new ApiError(400, 'unsupported')
}

class ApiError extends Error {
  status: number
  constructor(status: number, code: string) {
    super(code)
    this.status = status
  }
}

// Follows redirects by hand so every hop (short links like amzn.in → amazon.in) is checked before it's fetched.
async function safeFetch(raw: string, accept: string) {
  let url = new URL(raw)
  for (let hop = 0; hop < 6; hop++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA, accept, 'accept-language': 'en-IN,en;q=0.9' },
    }).catch(() => {
      throw new ApiError(502, 'unreachable')
    })
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url)
      continue
    }
    return { res, url }
  }
  throw new ApiError(502, 'unreachable')
}

async function readCapped(res: Response, max: number) {
  if (Number(res.headers.get('content-length')) > max) throw new ApiError(413, 'too-large')
  const reader = res.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > max) {
      await reader.cancel()
      throw new ApiError(413, 'too-large')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function product(target: string, res: ServerResponse) {
  const link = parseProductLink(target)
  if (!link) throw new ApiError(400, 'bad-link')
  // Shopify's product JSON is exact and never a robot check, so try it before scraping the page.
  const json = shopifyJsonUrl(link.url)
  if (json) {
    const info = await safeFetch(json, 'application/json')
      .then(async ({ res: r }) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? fromShopifyJson(JSON.parse((await readCapped(r, PAGE_MAX)).toString('utf8'))) : null))
      .catch(() => null)
    if (info) return send(res, 200, info)
  }
  const { res: page, url } = await safeFetch(link.url, 'text/html,application/xhtml+xml')
  const type = page.headers.get('content-type') ?? ''
  if (type.startsWith('image/')) return send(res, 200, { title: '', price: null, images: [url.href], store: link.store })
  // Stores answer automated visits with a robot check instead of the product.
  if (page.status === 503 || page.status === 403 || page.status === 429) throw new ApiError(502, 'blocked')
  if (!page.ok) throw new ApiError(502, 'unreachable')
  const html = (await readCapped(page, PAGE_MAX)).toString('utf8')
  const info = extractProduct(html, url.href)
  if (!info.images.length) throw new ApiError(502, /captcha|robot check|are you a human/i.test(html) ? 'blocked' : 'no-images')
  send(res, 200, info)
}

async function image(target: string, res: ServerResponse) {
  let url: URL
  try {
    url = new URL(target)
  } catch {
    throw new ApiError(400, 'bad-link')
  }
  const { res: img } = await safeFetch(url.href, 'image/avif,image/webp,image/png,image/jpeg,image/*')
  const type = img.headers.get('content-type') ?? ''
  if (!img.ok) throw new ApiError(502, 'unreachable')
  if (!/^image\/(jpeg|png|webp|avif|gif)/.test(type)) throw new ApiError(415, 'not-image')
  const body = await readCapped(img, IMAGE_MAX)
  res.statusCode = 200
  res.setHeader('content-type', type)
  res.setHeader('cache-control', 'private, max-age=3600')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(body)
}

async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const u = new URL(req.url ?? '/', 'http://local')
  const route = u.pathname.replace(/^.*\/api\//, '/api/')
  if (route !== '/api/product' && route !== '/api/image') return next()
  if (req.method !== 'GET') return send(res, 405, { error: 'method' })
  const target = u.searchParams.get('url') ?? ''
  try {
    if (route === '/api/product') await product(target, res)
    else await image(target, res)
  } catch (err) {
    if (err instanceof ApiError) send(res, err.status, { error: err.message })
    else send(res, 500, { error: 'failed' })
  }
}

export function productApi(): Plugin {
  return {
    name: 'motionfit-product-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handle(req, res, next))
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handle(req, res, next))
    },
  }
}
