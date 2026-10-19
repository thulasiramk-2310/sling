// Time of day along the trip: sunrise in Chennai, noon inland, sunset and dusk in Madurai, night at the sea.
// Pure data and maths (no three.js), so it is easy to test.
import { clamp } from './util.js'

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

// Each key is one moment of the day, placed at a point along the route (u from 0 to 1).
const KEYS = [
  { u: 0.0, phase: 'sunrise', elev: 5, top: '#5e5e94', horizon: '#f6b48c', glow: '#ff9668', glowAmt: 1.0, fog: '#eab89c', light: '#ffc89a', lightI: 1.5, hemiSky: '#ffd6b8', hemiGround: '#7a5a5a', hemiI: 0.85, sea: '#4a6a8e', night: 0.08 },
  { u: 0.14, phase: 'sunrise', elev: 22, top: '#7896c4', horizon: '#f4dcc2', glow: '#ffd2a8', glowAmt: 0.55, fog: '#eadccb', light: '#fff0d8', lightI: 2.0, hemiSky: '#dfe6f2', hemiGround: '#8a7462', hemiI: 0.95, sea: '#3a7a9e', night: 0 },
  { u: 0.34, phase: 'noon', elev: 52, top: '#4f86c4', horizon: '#ecdcc6', glow: '#ffe6c4', glowAmt: 0.35, fog: '#e6d8c4', light: '#fff8ec', lightI: 2.4, hemiSky: '#dce8f2', hemiGround: '#948066', hemiI: 1.0, sea: '#2f86a8', night: 0 },
  { u: 0.5, phase: 'noon', elev: 66, top: '#4c84c4', horizon: '#eadcc8', glow: '#ffe6c4', glowAmt: 0.3, fog: '#e4d8c6', light: '#fffaf0', lightI: 2.5, hemiSky: '#dce8f2', hemiGround: '#948066', hemiI: 1.0, sea: '#2f86a8', night: 0 },
  { u: 0.58, phase: 'sunset', elev: 28, top: '#8a92c0', horizon: '#f4cfae', glow: '#ffc890', glowAmt: 0.6, fog: '#ecd0b6', light: '#ffd6a8', lightI: 2.0, hemiSky: '#f6dcc8', hemiGround: '#866050', hemiI: 0.9, sea: '#4a7aa0', night: 0 },
  { u: 0.64, phase: 'sunset', elev: 6, top: '#6a5a8e', horizon: '#f2906a', glow: '#ff7a58', glowAmt: 1.2, fog: '#dc9c86', light: '#ffa070', lightI: 1.6, hemiSky: '#f6b49c', hemiGround: '#5a3a44', hemiI: 0.78, sea: '#7a5a7e', night: 0.2 },
  { u: 0.69, phase: 'sunset', elev: -3, top: '#2e2a5a', horizon: '#c0607e', glow: '#e06a88', glowAmt: 0.85, fog: '#6a4a6a', light: '#9a7ab0', lightI: 0.55, hemiSky: '#7a6aa6', hemiGround: '#2e2034', hemiI: 0.62, sea: '#3a345e', night: 0.6 },
  { u: 0.78, phase: 'night', elev: -20, top: '#0c1230', horizon: '#2a3260', glow: '#3a4a8a', glowAmt: 0.25, fog: '#141c3c', light: '#b4c6ff', lightI: 0.7, hemiSky: '#5a68a6', hemiGround: '#141830', hemiI: 0.6, sea: '#0e2246', night: 1 },
  { u: 1.0, phase: 'night', elev: -20, top: '#090e26', horizon: '#232c56', glow: '#3a4a8a', glowAmt: 0.2, fog: '#111836', light: '#b4c6ff', lightI: 0.72, hemiSky: '#5a68a6', hemiGround: '#141830', hemiI: 0.6, sea: '#0c1e3e', night: 1 },
].map((k) => ({
  ...k,
  top: hex(k.top),
  horizon: hex(k.horizon),
  glow: hex(k.glow),
  fog: hex(k.fog),
  light: hex(k.light),
  hemiSky: hex(k.hemiSky),
  hemiGround: hex(k.hemiGround),
  sea: hex(k.sea),
}))

const COLOR_FIELDS = ['top', 'horizon', 'glow', 'fog', 'light', 'hemiSky', 'hemiGround', 'sea']
const NUMBER_FIELDS = ['elev', 'glowAmt', 'lightI', 'hemiI', 'night']

// Blends the two keys either side of u.
export function sample(u) {
  const x = clamp(u, 0, 1)
  let i = 0
  while (i < KEYS.length - 2 && x > KEYS[i + 1].u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = clamp((x - a.u) / (b.u - a.u), 0, 1)
  const out = { phase: t < 0.5 ? a.phase : b.phase }
  for (const f of NUMBER_FIELDS) out[f] = a[f] + (b[f] - a[f]) * t
  for (const f of COLOR_FIELDS) out[f] = a[f].map((v, k) => v + (b[f][k] - v) * t)
  return out
}

// Name of the time of day, used by the on-screen label.
export function phaseAt(u) {
  const x = clamp(u, 0, 1)
  if (x < 0.2) return 'sunrise'
  if (x < 0.56) return 'noon'
  if (x < 0.74) return 'sunset'
  return 'night'
}
