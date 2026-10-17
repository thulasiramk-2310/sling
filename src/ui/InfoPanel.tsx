import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { bodies, bodyById } from '../data/bodies'
import { useStore } from '../core/store'

const ease = [0.16, 1, 0.3, 1] as const

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const k = Math.min((t - start) / 1200, 1)
      setShown(value * (1 - Math.pow(1 - k, 4)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
}

export function InfoPanel() {
  const selectedId = useStore((s) => s.selectedId)
  const hand = useStore((s) => s.tracking === 'ready')
  const select = useStore((s) => s.select)
  const body = selectedId ? bodyById.get(selectedId) : null
  const index = body ? bodies.indexOf(body) : -1
  const step = (dir: number) => select(bodies[(index + dir + bodies.length) % bodies.length].id)

  return (
    <AnimatePresence mode="wait">
      {body && (
        <motion.aside
          key={body.id}
          className="panel glass"
          initial={{ opacity: 0, x: 60, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease }}
          style={{ ['--accent' as string]: body.atmosphere }}
        >
          <div className="panel-index mono">
            {String(index + 1).padStart(2, '0')} <span>/ {String(bodies.length).padStart(2, '0')}</span>
          </div>
          <h2 className="panel-title">{body.name}</h2>
          <p className="panel-tagline">{body.tagline}</p>
          <dl className="stats">
            {body.stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="stat"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.6, ease }}
              >
                <dt className="mono">{s.label}</dt>
                <dd>
                  <CountUp value={s.value} decimals={s.decimals} />
                  {s.unit && <span className="unit">{s.unit}</span>}
                </dd>
              </motion.div>
            ))}
          </dl>
          <motion.p
            className="fact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <span className="mono">Did you know</span>
            {body.fact}
          </motion.p>
          <div className="panel-nav">
            <button data-hand className="btn ghost sm" onClick={() => step(-1)} aria-label="Previous world">
              ←
            </button>
            <button data-hand className="btn ghost sm grow" onClick={() => select(null)}>
              {hand ? 'Back · or hold open palm' : 'Back to system · Esc'}
            </button>
            <button data-hand className="btn ghost sm" onClick={() => step(1)} aria-label="Next world">
              →
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
