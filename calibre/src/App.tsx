import { useEffect } from 'react'
import { parts } from './data/parts'
import { useStore } from './store'
import { Stage } from './scene/Stage'
import { Intro } from './ui/Intro'
import { Hud } from './ui/Hud'

export default function App() {
  const entered = useStore((s) => s.entered)
  const touring = useStore((s) => s.touring)
  const hovered = useStore((s) => s.hovered)

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
  }, [hovered])

  useEffect(() => {
    if (!touring) return
    const id = setInterval(() => {
      const s = useStore.getState()
      const i = parts.findIndex((p) => p.id === s.selected)
      if (i >= parts.length - 1) {
        s.setTouring(false)
        return
      }
      s.select(parts[i + 1].id, true)
    }, 6500)
    return () => clearInterval(id)
  }, [touring])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().select(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  return (
    <>
      <div className="stage">
        <Stage />
      </div>
      <Intro />
      {entered && <Hud />}
    </>
  )
}
