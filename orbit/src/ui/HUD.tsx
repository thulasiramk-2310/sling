import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { bodies } from '../data/bodies'
import { useStore } from '../core/store'
import { Cursor } from './Cursor'
import { HandPreview } from './HandPreview'
import { InfoPanel } from './InfoPanel'

const ease = [0.16, 1, 0.3, 1] as const
const SPEEDS = [
  { label: 'Pause', value: 0 },
  { label: '1×', value: 1 },
  { label: '10×', value: 10 },
]

const HAND_TIPS = [
  ['Pinch a world', 'Fly to it'],
  ['Pinch & drag space', 'Rotate the system'],
  ['Pinch with both hands', 'Spread to zoom'],
  ['Hold an open palm', 'Go back'],
]
const MOUSE_TIPS = [
  ['Click a world', 'Fly to it'],
  ['Drag', 'Rotate the system'],
  ['Scroll', 'Zoom'],
  ['Esc', 'Go back'],
]

function TopBar() {
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  const hand = useStore((s) => s.tracking === 'ready')
  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8, ease }}
    >
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">ORBIT</span>
        <span className="mode-chip mono">{hand ? 'Hand control' : 'Mouse'}</span>
      </div>
      <div className="segmented glass" role="group" aria-label="Simulation speed">
        {SPEEDS.map((s) => (
          <button
            key={s.label}
            data-hand
            className={speed === s.value ? 'active' : ''}
            onClick={() => setSpeed(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </motion.header>
  )
}

function Dock() {
  const selectedId = useStore((s) => s.selectedId)
  const hoveredId = useStore((s) => s.hoveredId)
  const select = useStore((s) => s.select)
  return (
    <motion.nav
      className="dock glass"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.8, ease }}
      aria-label="Worlds"
    >
      {bodies.map((b) => (
        <button
          key={b.id}
          data-hand
          className={`dock-item ${selectedId === b.id ? 'active' : ''} ${hoveredId === b.id ? 'hot' : ''}`}
          onClick={() => select(selectedId === b.id ? null : b.id)}
          style={{
            ['--c1' as string]: b.colors[2],
            ['--c2' as string]: b.colors[0],
            ['--glow' as string]: b.atmosphere,
          }}
        >
          <span className="orb" />
          <span className="dock-label">{b.name}</span>
        </button>
      ))}
    </motion.nav>
  )
}

function Guide() {
  const hand = useStore((s) => s.tracking === 'ready')
  const [open, setOpen] = useState(true)
  const tips = hand ? HAND_TIPS : MOUSE_TIPS
  return (
    <motion.div
      className="guide"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.8, ease }}
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className="guide-list glass"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            {tips.map(([how, what]) => (
              <li key={how}>
                <span className="mono">{how}</span>
                <span>{what}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <button data-hand className="btn ghost sm guide-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Hide controls' : 'Controls'}
      </button>
    </motion.div>
  )
}

function HandHint() {
  const show = useStore((s) => s.tracking === 'ready' && s.handCount === 0)
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="hand-hint glass"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.5, ease }}
        >
          <span className="pulse" />
          Raise your hand in front of the camera
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function HUD() {
  const hand = useStore((s) => s.tracking === 'ready')
  return (
    <>
      <TopBar />
      <Dock />
      <Guide />
      <InfoPanel />
      {hand && <HandPreview />}
      <HandHint />
      <Cursor />
    </>
  )
}
