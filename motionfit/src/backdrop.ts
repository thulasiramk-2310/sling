import type { PersonMask } from './pose'

export type BackdropMode = 'off' | 'blur' | 'studio'

// Composites the camera image over a replacement background using the person mask.
export class Backdrop {
  private person = document.createElement('canvas')
  private maskCanvas = document.createElement('canvas')
  private maskData: ImageData | null = null
  private lastMask: { mask: PersonMask; at: number } | null = null

  draw(ctx: CanvasRenderingContext2D, frame: HTMLCanvasElement, mask: PersonMask | null, mode: BackdropMode, w: number, h: number, colors: { a: string; b: string }) {
    const vw = frame.width
    const vh = frame.height
    if (!vw) return
    const scale = Math.max(w / vw, h / vh)
    const dw = vw * scale
    const dh = vh * scale
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2

    if (mode === 'off') {
      ctx.drawImage(frame, dx, dy, dw, dh)
      return
    }
    // Hold the last mask briefly so a dropped frame doesn't make the person flicker out.
    const now = performance.now()
    if (mask) this.lastMask = { mask, at: now }
    else if (this.lastMask && now - this.lastMask.at < 600) mask = this.lastMask.mask

    if (mode === 'blur') {
      ctx.save()
      ctx.filter = 'blur(18px) saturate(0.8)'
      ctx.drawImage(frame, dx - 20, dy - 20, dw + 40, dh + 40)
      ctx.restore()
    } else {
      const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.45, Math.max(w, h) * 0.8)
      g.addColorStop(0, colors.a)
      g.addColorStop(1, colors.b)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }

    // Nobody detected: the chosen background alone.
    if (!mask) return

    // Person layer: frame pixels kept where the mask says "person".
    if (this.maskCanvas.width !== mask.width || this.maskCanvas.height !== mask.height || !this.maskData) {
      this.maskCanvas.width = mask.width
      this.maskCanvas.height = mask.height
      this.maskData = new ImageData(mask.width, mask.height)
    }
    const px = this.maskData.data
    for (let i = 0; i < mask.data.length; i++) px[i * 4 + 3] = Math.max(0, Math.min(255, (mask.data[i] - 0.25) * 2 * 255))
    this.maskCanvas.getContext('2d')!.putImageData(this.maskData, 0, 0)

    this.person.width = Math.round(w)
    this.person.height = Math.round(h)
    const p = this.person.getContext('2d')!
    p.clearRect(0, 0, w, h)
    p.drawImage(frame, dx, dy, dw, dh)
    p.globalCompositeOperation = 'destination-in'
    p.filter = 'blur(2px)'
    p.drawImage(this.maskCanvas, dx, dy, dw, dh)
    p.filter = 'none'
    p.globalCompositeOperation = 'source-over'
    ctx.drawImage(this.person, 0, 0)
  }
}
