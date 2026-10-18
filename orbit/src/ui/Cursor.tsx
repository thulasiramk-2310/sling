import { useEffect, useRef } from 'react'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { bodyById } from '../data/bodies'

export function Cursor() {
  const el = useRef<HTMLDivElement>(null)
  const hand = useStore((s) => s.tracking === 'ready')
  const hoveredId = useStore((s) => s.hoveredId)
  const name = hoveredId ? bodyById.get(hoveredId)?.name : null

  useEffect(() => {
    document.body.style.cursor = !hand && hoveredId ? 'pointer' : ''
  }, [hand, hoveredId])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const node = el.current
      if (!node) return
      const px = ((input.x + 1) / 2) * window.innerWidth
      const py = ((1 - input.y) / 2) * window.innerHeight
      node.style.transform = `translate3d(${px}px, ${py}px, 0)`
      node.dataset.visible = String(input.visible)
      node.dataset.down = String(input.down)
      node.style.setProperty('--palm', String(input.palmProgress))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={el} className={`cursor ${hand ? 'is-hand' : 'is-mouse'}`} aria-hidden>
      {hand && (
        <>
          <div className="cursor-palm" />
          <div className="cursor-ring" />
          <div className="cursor-dot" />
        </>
      )}
      {name && <div className="cursor-label mono">{name}</div>}
    </div>
  )
}
