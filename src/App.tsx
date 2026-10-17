import { useEffect } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { input } from './core/input'
import { useStore } from './core/store'
import { World } from './scene/World'
import { Intro } from './ui/Intro'
import { HUD } from './ui/HUD'

function setPointer(e: { clientX: number; clientY: number }) {
  input.x = (e.clientX / window.innerWidth) * 2 - 1
  input.y = -((e.clientY / window.innerHeight) * 2 - 1)
}

export default function App() {
  const phase = useStore((s) => s.phase)

  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => {
      if (input.source !== 'mouse') return
      setPointer(e)
      input.visible = (e.target as Element | null)?.tagName === 'CANVAS'
    }
    const up = () => {
      if (input.source === 'mouse') input.down = false
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') input.back = true
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', key)
    }
  }, [])

  const onPointerDown = (e: PointerEvent) => {
    if (input.source !== 'mouse') return
    setPointer(e)
    input.visible = true
    input.down = true
  }
  const onWheel = (e: WheelEvent) => {
    input.zoom += e.deltaY * 0.0012
  }

  return (
    <>
      <div className="stage" onPointerDown={onPointerDown} onWheel={onWheel}>
        <World />
      </div>
      <Intro />
      {phase === 'explore' && <HUD />}
    </>
  )
}
