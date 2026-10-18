import { AnimatePresence, motion } from 'framer-motion'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { startHandTracking } from '../tracking/handTracker'

const ease = [0.16, 1, 0.3, 1] as const

function describeError(err: unknown) {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') return 'Camera access was blocked. Allow it in your browser settings, or continue with the mouse.'
  if (name === 'NotFoundError') return 'No camera was found on this device. You can still explore with the mouse.'
  if (name === 'NotReadableError') return 'Your camera is in use by another app. Close it and try again.'
  return 'Hand tracking could not start on this device. You can still explore with the mouse.'
}

export function Intro() {
  const phase = useStore((s) => s.phase)
  const tracking = useStore((s) => s.tracking)
  const error = useStore((s) => s.trackingError)
  const loading = tracking === 'loading'

  const startHands = async () => {
    const { setTracking, setPhase } = useStore.getState()
    setTracking('loading')
    try {
      await startHandTracking()
      input.source = 'hand'
      input.visible = false
      setTracking('ready')
      setPhase('explore')
    } catch (err) {
      console.error(err)
      setTracking('error', describeError(err))
    }
  }

  const startMouse = () => {
    input.source = 'mouse'
    useStore.getState().setPhase('explore')
  }

  return (
    <AnimatePresence>
      {phase === 'intro' && (
        <motion.section
          className="intro"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(14px)' }}
          transition={{ duration: 0.9, ease }}
        >
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease }}
          >
            An interactive solar system
          </motion.p>
          <h1 className="title" aria-label="Orbit">
            {'ORBIT'.split('').map((c, i) => (
              <span className="title-mask" key={i} aria-hidden>
                <motion.span
                  className="title-char"
                  initial={{ y: '110%', rotate: 8 }}
                  animate={{ y: '0%', rotate: 0 }}
                  transition={{ delay: 0.25 + i * 0.08, duration: 1.2, ease }}
                >
                  {c}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            className="lede"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.9, ease }}
          >
            The solar system, <em>at your fingertips.</em> Reach out and explore nine worlds
            with nothing but your hands.
          </motion.p>
          <motion.div
            className="actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.9, ease }}
          >
            <button className="btn primary" onClick={startHands} disabled={loading}>
              <span className="btn-glow" />
              {loading ? 'Waking the cosmos…' : 'Enable hand control'}
            </button>
            <button className="btn ghost" onClick={startMouse} disabled={loading}>
              Continue with mouse
            </button>
          </motion.div>
          {error && (
            <motion.p className="intro-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert">
              {error}
            </motion.p>
          )}
          <motion.p
            className="privacy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            Your camera feed is processed on this device and never leaves it.
          </motion.p>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
