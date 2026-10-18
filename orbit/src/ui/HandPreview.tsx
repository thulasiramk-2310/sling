import { useEffect, useRef } from 'react'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { HAND_CONNECTIONS, tracker } from '../tracking/handTracker'

export function HandPreview() {
  const feed = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const gesture = useStore((s) => s.gesture)
  const handCount = useStore((s) => s.handCount)

  useEffect(() => {
    const video = tracker.video
    if (video && feed.current) {
      video.className = 'preview-video'
      feed.current.prepend(video)
    }
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = canvas.current
      const ctx = c?.getContext('2d')
      if (!c || !ctx) return
      ctx.clearRect(0, 0, c.width, c.height)
      for (const hand of input.hands) {
        ctx.strokeStyle = input.down ? 'rgba(255,196,120,0.95)' : 'rgba(150,210,255,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (const { start, end } of HAND_CONNECTIONS) {
          ctx.moveTo(hand[start].x * c.width, hand[start].y * c.height)
          ctx.lineTo(hand[end].x * c.width, hand[end].y * c.height)
        }
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        for (const p of hand) {
          ctx.beginPath()
          ctx.arc(p.x * c.width, p.y * c.height, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      video?.remove()
    }
  }, [])

  return (
    <div className="preview glass">
      <div className="preview-feed" ref={feed}>
        <canvas ref={canvas} width={320} height={240} />
      </div>
      <div className="preview-meta mono">
        <span className={`live-dot ${handCount ? 'on' : ''}`} />
        {gesture || 'Starting…'}
      </div>
    </div>
  )
}
