// Downloads model files with byte-level progress, so the UI can show a real progress bar
// instead of an open-ended "Loading…". The wasm runtime is fetched too, which warms the HTTP cache
// before MediaPipe asks for it.
export type Progress = (loaded: number, total: number) => void

async function fetchBytes(url: string, onChunk: (n: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Could not download ${url} (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    onChunk(value.length, total)
  }
  const out = new Uint8Array(size)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.length
  }
  return out
}

export async function loadModel(assetBase: string, model: string, onProgress?: Progress) {
  const files = [`${assetBase}models/${model}`, `${assetBase}mediapipe/vision_wasm_internal.wasm`]
  const totals = new Map<string, number>()
  const loaded = new Map<string, number>()
  // Only report a total once every file's size is known, so the bar never slides backwards.
  const report = () => {
    const l = [...loaded.values()].reduce((a, b) => a + b, 0)
    if (totals.size < files.length) return onProgress?.(l, 0)
    const t = [...totals.values()].reduce((a, b) => a + b, 0)
    onProgress?.(l, Math.max(t, l))
  }
  const [modelBytes] = await Promise.all(
    files.map((url) =>
      fetchBytes(url, (n, total) => {
        totals.set(url, total)
        loaded.set(url, (loaded.get(url) ?? 0) + n)
        report()
      }).catch((err) => {
        // The wasm prefetch is only a cache warm-up; MediaPipe will fetch it itself if this fails.
        if (url.endsWith('.wasm')) return new Uint8Array()
        throw err
      }),
    ),
  )
  return modelBytes
}
