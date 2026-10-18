import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { partById, parts } from '../data/parts'
import { beat, sim } from '../sim'
import { useStore, type View } from '../store'

const ease = [0.22, 1, 0.36, 1] as const
const pad = (n: number) => String(n).padStart(2, '0')

function Clock() {
  const time = useRef<HTMLSpanElement>(null)
  const led = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = ((sim.t % 86400) + 86400) % 86400
      if (time.current) time.current.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(Math.floor(t % 60))}`
      const b = beat(sim.t).index
      if (b !== last && led.current) {
        last = b
        led.current.classList.toggle('alt')
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="clock">
      <span className="beat-led" ref={led} aria-hidden />
      <span className="mono clock-time" ref={time} />
      <span className="mono dim">8 beats / s</span>
    </div>
  )
}

function FlowRail() {
  const selected = useStore((s) => s.selected)
  const touring = useStore((s) => s.touring)
  const select = useStore((s) => s.select)
  const toggleTour = () => {
    const s = useStore.getState()
    if (s.touring) s.setTouring(false)
    else {
      s.setTouring(true)
      s.select(parts[0].id, true)
    }
  }
  return (
    <motion.nav
      className="rail"
      aria-label="Parts, in the order power flows"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.9, ease }}
    >
      <div className="rail-head">
        <span className="mono dim">Power flow</span>
        <button className={`tour ${touring ? 'on' : ''}`} onClick={toggleTour}>
          {touring ? 'Stop tour' : 'Play tour'}
        </button>
      </div>
      <ol>
        {parts.map((p, i) => (
          <li key={p.id}>
            <button className={selected === p.id ? 'active' : ''} onClick={() => select(selected === p.id ? null : p.id)}>
              <span className="mono step">{pad(i + 1)}</span>
              <span className="rail-name">{p.name}</span>
              <span className="rail-role">{p.role}</span>
            </button>
          </li>
        ))}
      </ol>
    </motion.nav>
  )
}

function Detail() {
  const selected = useStore((s) => s.selected)
  const select = useStore((s) => s.select)
  const part = selected ? partById.get(selected) : null
  const index = part ? parts.indexOf(part) : -1
  return (
    <AnimatePresence mode="wait">
      {part && (
        <motion.aside
          key={part.id}
          className="detail"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.55, ease }}
        >
          <div className="detail-top">
            <span className="mono dim">
              Step {pad(index + 1)} of {pad(parts.length)}
            </span>
            <button className="close" onClick={() => select(null)} aria-label="Close">
              ×
            </button>
          </div>
          <h2>{part.name}</h2>
          <p className="detail-role">{part.role}</p>
          <p className="detail-text">{part.description}</p>
          <dl>
            {part.specs.map(([k, v]) => (
              <div key={k}>
                <dt className="mono">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="detail-nav">
            <button disabled={index === 0} onClick={() => select(parts[index - 1].id)}>
              ← {index > 0 ? parts[index - 1].name : ''}
            </button>
            <button disabled={index === parts.length - 1} onClick={() => select(parts[index + 1].id)}>
              {index < parts.length - 1 ? parts[index + 1].name : ''} →
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'dial', label: 'Dial' },
  { id: 'movement', label: 'Movement' },
  { id: 'exploded', label: 'Exploded' },
]
const SPEEDS = [
  { v: 0, label: 'Pause' },
  { v: 0.08, label: 'Slow' },
  { v: 1, label: 'Real time' },
]

function Controls() {
  const view = useStore((s) => s.view)
  const explode = useStore((s) => s.explode)
  const speed = useStore((s) => s.speed)
  const { setView, setExplode, setSpeed } = useStore.getState()
  return (
    <motion.div
      className="controls"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.9, ease }}
    >
      <div className="seg" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <label className="slider">
        <span className="mono dim">Explode</span>
        <input
          id="explode"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explode}
          onChange={(e) => setExplode(Number(e.target.value))}
          style={{ ['--fill' as string]: `${explode * 100}%` }}
        />
      </label>
      <div className="seg" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button key={s.label} className={speed === s.v ? 'on' : ''} onClick={() => setSpeed(s.v)}>
            {s.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export function Hud() {
  return (
    <>
      <motion.header
        className="brand"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.9, ease }}
      >
        <span className="brand-name">Calibre</span>
        <span className="mono dim">C-28 · 28,800 vph · 21 jewels</span>
      </motion.header>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}>
        <Clock />
      </motion.div>
      <FlowRail />
      <Detail />
      <Controls />
    </>
  )
}
