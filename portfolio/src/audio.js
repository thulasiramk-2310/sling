// All sound is made live with the Web Audio API, so the site ships no audio files:
// a small auto engine, a soft veena-style melody over a drone, and a few game sounds.
const KEY = 'ram.muted'

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let engine = null
let muted = false
let started = false
let timer = 0

try {
  muted = localStorage.getItem(KEY) === '1'
} catch {
  muted = false
}

function noiseBuffer(seconds = 1) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// A made-up room: decaying noise gives the veena a soft echo.
function reverbImpulse() {
  const len = ctx.sampleRate * 2.4
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  return buf
}

// ---- engine: a low put-put that speeds up with scroll speed ----
function buildEngine() {
  const out = ctx.createGain()
  out.gain.value = 0
  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 320
  low.connect(out)
  out.connect(master)
  const saw = ctx.createOscillator()
  saw.type = 'sawtooth'
  const square = ctx.createOscillator()
  square.type = 'square'
  const mix = ctx.createGain()
  mix.gain.value = 0.5
  saw.connect(mix)
  square.connect(mix)
  // the "put-put": a fast tremolo on the loudness
  const pulse = ctx.createGain()
  pulse.gain.value = 0.6
  mix.connect(pulse)
  pulse.connect(low)
  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = 0.4
  lfo.connect(lfoDepth)
  lfoDepth.connect(pulse.gain)
  // a little rattle
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer()
  noise.loop = true
  const nf = ctx.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = 400
  const ng = ctx.createGain()
  ng.gain.value = 0.05
  noise.connect(nf)
  nf.connect(ng)
  ng.connect(low)
  for (const n of [saw, square, lfo, noise]) n.start()
  return { out, saw, square, lfo, low, ng }
}

// ---- music: drone plus a wandering melody in raga Mohanam (a five-note scale) ----
const SA = 196 // G3
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]

const noteFreq = (i) => SA * 2 * SCALE[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5))

function pluck(freq, when, dur, level = 0.18) {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  // a quick slide up into the note, like a veena gamaka
  o.frequency.setValueAtTime(freq * 0.965, when)
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.07)
  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = freq * 2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(level, when + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  const g2 = ctx.createGain()
  g2.gain.value = 0.3
  o.connect(g)
  o2.connect(g2)
  g2.connect(g)
  g.connect(musicBus)
  o.start(when)
  o2.start(when)
  o.stop(when + dur + 0.05)
  o2.stop(when + dur + 0.05)
}

function buildMusic() {
  musicBus = ctx.createGain()
  musicBus.gain.value = 0.55
  const verb = ctx.createConvolver()
  verb.buffer = reverbImpulse()
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  musicBus.connect(master)
  musicBus.connect(verb)
  verb.connect(wet)
  wet.connect(master)

  // soft drone: Sa, Pa and a higher Sa, breathing slowly
  const pad = ctx.createGain()
  pad.gain.value = 0.045
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 700
  pad.connect(lp)
  lp.connect(musicBus)
  for (const [f, d] of [
    [SA / 2, 0],
    [SA * 0.75, 3],
    [SA, -2],
    [SA * 1.003, 2],
  ]) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    o.detune.value = d
    o.connect(pad)
    o.start()
  }
  const breath = ctx.createOscillator()
  breath.frequency.value = 0.09
  const bd = ctx.createGain()
  bd.gain.value = 0.02
  breath.connect(bd)
  bd.connect(pad.gain)
  breath.start()

  // melody: a gentle random walk that keeps coming back to Sa
  let idx = 0
  let next = ctx.currentTime + 0.6
  let count = 0
  const beat = 0.66
  const durations = [1, 1, 0.5, 0.5, 1.5, 0.75, 0.25, 2]
  timer = window.setInterval(() => {
    while (next < ctx.currentTime + 1.2) {
      const step = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]
      idx = Math.max(-3, Math.min(9, idx + step))
      count++
      const phraseEnd = count % 8 === 0
      if (phraseEnd) idx = Math.round(idx / 5) * 5
      const d = (phraseEnd ? 2 : durations[Math.floor(Math.random() * durations.length)]) * beat
      if (Math.random() > 0.14) pluck(noteFreq(idx), next, 1.6 + d, phraseEnd ? 0.2 : 0.15)
      next += d
    }
  }, 300)
}

// ---- public API ----
export const audio = {
  // Must be called from a click: browsers only allow sound after a user gesture.
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 0.9
      master.connect(ctx.destination)
      sfxBus = ctx.createGain()
      sfxBus.gain.value = 0.6
      sfxBus.connect(master)
      engine = buildEngine()
      buildMusic()
      started = true
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return
        if (document.hidden) ctx.suspend()
        else ctx.resume()
      })
    }
    ctx.resume()
    return true
  },
  isMuted: () => muted,
  isStarted: () => started,
  setMuted(m) {
    muted = m
    try {
      localStorage.setItem(KEY, m ? '1' : '0')
    } catch {
      // Private mode: the choice lasts for this visit.
    }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.12)
  },
  // speed 0..1: how fast the auto is going. Idles quietly at 0.
  setEngine(speed) {
    if (!engine) return
    const t = ctx.currentTime
    engine.saw.frequency.setTargetAtTime(38 + speed * 62, t, 0.08)
    engine.square.frequency.setTargetAtTime(19 + speed * 31, t, 0.08)
    engine.lfo.frequency.setTargetAtTime(9 + speed * 20, t, 0.08)
    engine.low.frequency.setTargetAtTime(260 + speed * 700, t, 0.1)
    engine.out.gain.setTargetAtTime(0.05 + speed * 0.1, t, 0.1)
    engine.ng.gain.setTargetAtTime(0.03 + speed * 0.08, t, 0.1)
  },
  sfx: {
    blip(freq = 660, dur = 0.08, type = 'sine', level = 0.25, slide = 0) {
      if (!ctx || muted) return
      const o = ctx.createOscillator()
      o.type = type
      const g = ctx.createGain()
      const t = ctx.currentTime
      o.frequency.setValueAtTime(freq, t)
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
      g.gain.setValueAtTime(level, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g)
      g.connect(sfxBus)
      o.start(t)
      o.stop(t + dur + 0.02)
    },
    click() {
      audio.sfx.blip(520, 0.06, 'triangle', 0.18)
    },
    collect() {
      audio.sfx.blip(880, 0.1, 'sine', 0.22)
      setTimeout(() => audio.sfx.blip(1320, 0.16, 'sine', 0.2), 70)
    },
    crash() {
      if (!ctx || muted) return
      audio.sfx.blip(140, 0.35, 'sawtooth', 0.3, 0.3)
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer(0.4)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.25, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      src.connect(g)
      g.connect(sfxBus)
      src.start()
    },
    start() {
      audio.sfx.blip(440, 0.12, 'triangle', 0.2)
      setTimeout(() => audio.sfx.blip(660, 0.18, 'triangle', 0.2), 110)
    },
  },
  stop() {
    clearInterval(timer)
  },
}
