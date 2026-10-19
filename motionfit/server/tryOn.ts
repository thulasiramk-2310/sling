// Photo-real try-on: sends the shopper's photo and the garment to a generative try-on model and
// returns the picture of them wearing it. The live mirror is the quick preview; this is the "real" one.
//
// Providers, picked by which key is set when the server starts:
//   FASHN_API_KEY  → FASHN tryon-v1.6 (commercial licence, sharp prints and text)
//   HF_TOKEN       → IDM-VTON on Hugging Face Spaces (free GPU quota; non-commercial licence, fine for demos)
import type { IncomingMessage, ServerResponse } from 'node:http'

const BODY_MAX = 16 * 1024 * 1024
const FASHN = 'https://api.fashn.ai/v1'
const TIMEOUT_MS = 120_000

export interface TryOnRequest {
  person: string
  garment: string
  // Plain words about the garment help the model (e.g. "red graphic t-shirt, short sleeves").
  description: string
  category: 'tops' | 'bottoms' | 'one-pieces'
}

export class TryOnError extends Error {
  status: number
  constructor(status: number, code: string) {
    super(code)
    this.status = status
  }
}

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

export function parseTryOn(raw: unknown): TryOnRequest {
  const b = raw as Partial<TryOnRequest> | null
  if (!b || typeof b.person !== 'string' || typeof b.garment !== 'string') throw new TryOnError(400, 'bad-request')
  if (!DATA_URL.test(b.person) || !DATA_URL.test(b.garment)) throw new TryOnError(400, 'bad-image')
  const category = b.category === 'bottoms' || b.category === 'one-pieces' ? b.category : 'tops'
  const description = typeof b.description === 'string' ? b.description.replace(/[^\p{L}\p{N} ,.'&()-]/gu, '').slice(0, 120) : ''
  return { person: b.person, garment: b.garment, description, category }
}

export function provider(env: NodeJS.ProcessEnv = process.env): 'fashn' | 'huggingface' | null {
  if (env.FASHN_API_KEY) return 'fashn'
  if (env.HF_TOKEN) return 'huggingface'
  return null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fashn(req: TryOnRequest, key: string): Promise<string> {
  const headers = { authorization: `Bearer ${key}`, 'content-type': 'application/json' }
  const run = await fetch(`${FASHN}/run`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs: { model_image: req.person, garment_image: req.garment, category: req.category, mode: 'balanced', garment_photo_type: 'auto', output_format: 'jpeg', return_base64: true },
    }),
  }).catch(() => {
    throw new TryOnError(502, 'unreachable')
  })
  if (run.status === 401 || run.status === 403) throw new TryOnError(502, 'bad-key')
  if (run.status === 429) throw new TryOnError(429, 'busy')
  const { id } = (await run.json().catch(() => ({}))) as { id?: string }
  if (!run.ok || !id) throw new TryOnError(502, 'failed')
  const until = Date.now() + TIMEOUT_MS
  while (Date.now() < until) {
    await sleep(1500)
    const s = await fetch(`${FASHN}/status/${encodeURIComponent(id)}`, { headers, signal: AbortSignal.timeout(15_000) }).catch(() => null)
    if (!s?.ok) continue
    const body = (await s.json().catch(() => ({}))) as { status?: string; output?: string[]; error?: { name?: string } | null }
    if (body.status === 'completed' && body.output?.[0]) return body.output[0]
    if (body.status === 'failed') throw new TryOnError(422, body.error?.name === 'PoseError' ? 'no-person' : 'failed')
  }
  throw new TryOnError(504, 'timeout')
}

function toBlob(dataUrl: string) {
  const [head, b64] = dataUrl.split(',')
  const type = head.slice(5, head.indexOf(';'))
  return new Blob([Buffer.from(b64, 'base64')], { type })
}

async function huggingface(req: TryOnRequest, token: string): Promise<string> {
  const { Client, handle_file } = await import('@gradio/client')
  const app = await Client.connect('yisol/IDM-VTON', { hf_token: token as `hf_${string}` }).catch(() => {
    throw new TryOnError(502, 'unreachable')
  })
  const job = app.predict('/tryon', {
    dict: { background: handle_file(toBlob(req.person)), layers: [], composite: null },
    garm_img: handle_file(toBlob(req.garment)),
    garment_des: req.description || 'garment',
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: 42,
  })
  const result = await Promise.race([job, sleep(TIMEOUT_MS).then(() => null)]).catch((err: unknown) => {
    const text = String((err as { message?: string })?.message ?? err)
    throw new TryOnError(/quota|exceeded/i.test(text) ? 429 : 502, /quota|exceeded/i.test(text) ? 'busy' : 'failed')
  })
  if (!result) throw new TryOnError(504, 'timeout')
  const out = (result.data as { url?: string }[] | undefined)?.[0]?.url
  if (!out) throw new TryOnError(502, 'failed')
  // Fetch it here so the browser gets the picture from our own origin.
  const img = await fetch(out, { headers: { authorization: `Bearer ${token}` } })
  if (!img.ok) throw new TryOnError(502, 'failed')
  return `data:${img.headers.get('content-type') ?? 'image/webp'};base64,${Buffer.from(await img.arrayBuffer()).toString('base64')}`
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req as AsyncIterable<Buffer>) {
    size += c.length
    if (size > BODY_MAX) throw new TryOnError(413, 'too-large')
    chunks.push(c)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new TryOnError(400, 'bad-request')
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

// One render at a time per server: generation is slow and paid, and a double click shouldn't cost twice.
let busy = false

export async function handleTryOn(req: IncomingMessage, res: ServerResponse) {
  const which = provider()
  if (req.method === 'GET') return send(res, 200, { provider: which })
  if (req.method !== 'POST') return send(res, 405, { error: 'method' })
  if (!which) return send(res, 501, { error: 'no-provider' })
  if (busy) return send(res, 429, { error: 'busy' })
  busy = true
  try {
    const body = parseTryOn(await readJson(req))
    const started = Date.now()
    const image = which === 'fashn' ? await fashn(body, process.env.FASHN_API_KEY!) : await huggingface(body, process.env.HF_TOKEN!)
    send(res, 200, { image, provider: which, ms: Date.now() - started })
  } catch (err) {
    if (err instanceof TryOnError) send(res, err.status, { error: err.message })
    else send(res, 500, { error: 'failed' })
  } finally {
    busy = false
  }
}
