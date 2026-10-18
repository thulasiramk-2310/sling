import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'

const ease = [0.22, 1, 0.36, 1] as const

export function Intro() {
  const entered = useStore((s) => s.entered)
  const enter = useStore((s) => s.enter)
  return (
    <AnimatePresence>
      {!entered && (
        <motion.section
          className="intro"
          exit={{ opacity: 0, transition: { duration: 0.8, ease } }}
        >
          <motion.p
            className="mono intro-eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            A mechanical watch, opened up
          </motion.p>
          <h1 className="intro-title" aria-label="Calibre">
            {'Calibre'.split('').map((c, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.5 + i * 0.07, duration: 1.1, ease }}
                aria-hidden
              >
                {c}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="intro-lede"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.9, ease }}
          >
            One coiled spring, five wheels and a balance that swings 28,800 times an hour. The dial below
            shows the time right now. Turn it over to see how it keeps it.
          </motion.p>
          <motion.button
            className="intro-cta"
            onClick={enter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.9, ease }}
          >
            Open the caseback
          </motion.button>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
