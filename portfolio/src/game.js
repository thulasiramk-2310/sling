// Auto Dash: a small top-down game. Ride an auto-rickshaw or a bike, dodge traffic, collect filter coffee.
import gsap from 'gsap'
import { audio } from './audio.js'
import { LANES, PLAYER_Y, VEHICLES, moveLane, newGame, score, step } from './gameLogic.js'
import { t } from './i18n.js'

const BEST_KEY = 'ram.best'

// ---- drawing helpers (top-down, nose pointing up) ----
function rounded(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, r)
  ctx.fill()
}

const DRAW = {
  auto(ctx, x, y, w, h) {
    rounded(ctx, x - w * 0.42, y + h * 0.3, w * 0.16, h * 0.2, 3, '#111')
    rounded(ctx, x + w * 0.42, y + h * 0.3, w * 0.16, h * 0.2, 3, '#111')
    rounded(ctx, x, y - h * 0.44, w * 0.14, h * 0.16, 3, '#111')
    rounded(ctx, x, y + h * 0.05, w * 0.92, h * 0.78, w * 0.25, '#f2b705')
    rounded(ctx, x, y - h * 0.32, w * 0.5, h * 0.24, w * 0.2, '#f2b705')
    rounded(ctx, x, y + h * 0.12, w * 0.86, h * 0.56, w * 0.2, '#17171a')
    ctx.fillStyle = '#fff6c8'
    ctx.beginPath()
    ctx.arc(x, y - h * 0.44, w * 0.08, 0, Math.PI * 2)
    ctx.fill()
  },
  bike(ctx, x, y, w, h) {
    rounded(ctx, x, y - h * 0.38, w * 0.3, h * 0.22, 3, '#111')
    rounded(ctx, x, y + h * 0.38, w * 0.34, h * 0.22, 3, '#111')
    rounded(ctx, x, y, w * 0.55, h * 0.62, w * 0.25, '#1f4fa8')
    ctx.fillStyle = '#ddd'
    ctx.fillRect(x - w * 0.55, y - h * 0.24, w * 1.1, 3)
    ctx.fillStyle = '#c62828'
    ctx.beginPath()
    ctx.arc(x, y + h * 0.04, w * 0.3, 0, Math.PI * 2)
    ctx.fill()
  },
  bus(ctx, x, y, w, h) {
    rounded(ctx, x, y, w, h, 6, '#2b6cb0')
    ctx.fillStyle = '#e8eef5'
    for (let i = 0; i < 5; i++) ctx.fillRect(x - w * 0.36, y - h * 0.38 + i * h * 0.17, w * 0.72, h * 0.08)
    rounded(ctx, x, y - h * 0.46, w * 0.8, h * 0.05, 2, '#9fd0e6')
  },
  lorry(ctx, x, y, w, h) {
    rounded(ctx, x, y + h * 0.12, w, h * 0.74, 4, '#7d7a72')
    rounded(ctx, x, y - h * 0.36, w * 0.92, h * 0.26, 6, '#e07b1f')
    rounded(ctx, x, y - h * 0.44, w * 0.7, h * 0.06, 2, '#9fd0e6')
  },
  car(ctx, x, y, w, h, color = '#e9e6dd') {
    rounded(ctx, x, y, w, h, w * 0.28, color)
    rounded(ctx, x, y - h * 0.16, w * 0.7, h * 0.18, 4, '#2e3b46')
    rounded(ctx, x, y + h * 0.24, w * 0.7, h * 0.14, 4, '#2e3b46')
  },
  taxi(ctx, x, y, w, h) {
    DRAW.car(ctx, x, y, w, h, '#f2c200')
  },
  cow(ctx, x, y, w, h) {
    ctx.fillStyle = '#f2efe6'
    ctx.beginPath()
    ctx.ellipse(x, y, w * 0.32, h * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7a5236'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.08, y + h * 0.1, w * 0.12, h * 0.16, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8e2d2'
    ctx.beginPath()
    ctx.ellipse(x, y - h * 0.55, w * 0.16, h * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#3a2a1a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x - w * 0.18, y - h * 0.72)
    ctx.lineTo(x - w * 0.08, y - h * 0.62)
    ctx.moveTo(x + w * 0.18, y - h * 0.72)
    ctx.lineTo(x + w * 0.08, y - h * 0.62)
    ctx.stroke()
  },
  // A filter coffee: a steel tumbler in its dabara (saucer), seen from above, with a glow.
  cup(ctx, x, y, w, h, time) {
    const r = Math.min(w, h * 4) * 0.32
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2)
    g.addColorStop(0, 'rgba(224,178,58,.55)')
    g.addColorStop(1, 'rgba(224,178,58,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c9ccd1'
    ctx.beginPath()
    ctx.arc(x, y, r * 1.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e9ebee'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8a5a34'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.66, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(245,225,190,.8)'
    ctx.beginPath()
    ctx.arc(x - r * 0.18, y - r * 0.15, r * 0.24, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    const s = Math.sin(time * 4) * r * 0.2
    ctx.moveTo(x + r * 0.2, y - r * 1.4)
    ctx.quadraticCurveTo(x + r * 0.6 + s, y - r * 2, x + r * 0.2, y - r * 2.6)
    ctx.stroke()
  },
}

export function createGame({ onOpen, onClose }) {
  const root = document.getElementById('game')
  const canvas = root.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  const scoreEl = root.querySelector('[data-game="score"]')
  const coffeeEl = root.querySelector('[data-game="coffee"]')
  const bestEl = root.querySelector('[data-game="best"]')
  const menu = root.querySelector('.game-menu')
  const over = root.querySelector('.game-over')
  const finalEl = root.querySelector('[data-game="final"]')
  let vehicle = 'auto'
  let state = newGame(vehicle)
  let running = false
  let raf = 0
  let last = 0
  let time = 0
  let shake = 0
  let best = 0
  try {
    best = Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    best = 0
  }
  let W = 0
  let H = 0

  const fit = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = r.width
    H = r.height
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const laneW = () => (W * 0.78) / LANES
  const laneX = (lane) => W * 0.11 + laneW() * (lane + 0.5)

  function draw() {
    ctx.save()
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 14, (Math.random() - 0.5) * shake * 14)
    // verges with palms
    ctx.fillStyle = '#5f8a33'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#3d3c42'
    ctx.fillRect(W * 0.11, 0, W * 0.78, H)
    const scroll = (state.distance * 18) % 80
    ctx.fillStyle = '#f0e9d6'
    for (let l = 1; l < LANES; l++) {
      const x = W * 0.11 + laneW() * l
      for (let y = -80 + scroll; y < H; y += 80) ctx.fillRect(x - 2, y, 4, 40)
    }
    ctx.fillStyle = '#f2b705'
    ctx.fillRect(W * 0.11, 0, 4, H)
    ctx.fillRect(W * 0.89 - 4, 0, 4, H)
    for (let y = -120 + ((state.distance * 18) % 120); y < H; y += 120) {
      for (const x of [W * 0.05, W * 0.95]) {
        ctx.fillStyle = '#2f5a1f'
        ctx.beginPath()
        ctx.arc(x, y, W * 0.045, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const lw = laneW()
    for (const e of state.entities) {
      const draw = DRAW[e.kind]
      const k = e.kind === 'cup' ? { w: 0.5, h: 0.07 } : null
      const w = (k ? k.w : 0.7) * lw
      const h = (e.kind === 'bus' ? 0.24 : e.kind === 'lorry' ? 0.21 : e.kind === 'cow' ? 0.09 : e.kind === 'cup' ? 0.07 : 0.13) * H
      draw(ctx, laneX(e.lane), e.y * H, e.kind === 'cow' ? lw * 0.6 : w, h, time)
    }
    const v = VEHICLES[state.vehicle]
    const px = W * 0.11 + lw * (state.laneX + 0.5)
    DRAW[state.vehicle](ctx, px, PLAYER_Y * H, v.w * lw * (state.vehicle === 'bike' ? 1.5 : 1.05), v.h * H)
    ctx.restore()
  }

  function loop(now) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    time += dt
    shake = Math.max(0, shake - dt * 2)
    if (running) {
      for (const ev of step(state, dt)) {
        if (ev.type === 'coffee') {
          audio.sfx.collect()
          gsap.fromTo(coffeeEl, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'power3.out' })
        }
        if (ev.type === 'crash') end()
      }
      audio.setEngine(0.3 + state.speed * 0.35)
    }
    scoreEl.textContent = String(score(state))
    coffeeEl.textContent = String(state.coffee)
    bestEl.textContent = String(best)
    draw()
  }

  function begin() {
    state = newGame(vehicle)
    running = true
    menu.hidden = true
    over.hidden = true
    audio.sfx.start()
    canvas.focus({ preventScroll: true })
  }

  function end() {
    running = false
    shake = 1
    audio.sfx.crash()
    const s = score(state)
    if (s > best) {
      best = s
      try {
        localStorage.setItem(BEST_KEY, String(best))
      } catch {
        // Private mode: the best score lasts for this visit.
      }
    }
    finalEl.textContent = `${t('game.score')} ${s} · ${t('game.best')} ${best}`
    over.hidden = false
    gsap.fromTo(over, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
    over.querySelector('button').focus({ preventScroll: true })
  }

  function open() {
    root.hidden = false
    onOpen()
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.out' })
    gsap.fromTo(root.querySelector('.game-box'), { y: 40, scale: 0.96 }, { y: 0, scale: 1, duration: 0.7, ease: 'power3.out' })
    fit()
    state = newGame(vehicle)
    running = false
    menu.hidden = false
    over.hidden = true
    last = performance.now()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(loop)
    menu.querySelector('.game-vehicle[aria-pressed="true"]')?.focus({ preventScroll: true })
  }

  function close() {
    running = false
    cancelAnimationFrame(raf)
    gsap.to(root, { opacity: 0, duration: 0.35, ease: 'power3.out', onComplete: () => (root.hidden = true) })
    onClose()
  }

  // ---- controls ----
  window.addEventListener('keydown', (e) => {
    if (root.hidden) return
    if (e.key === 'Escape') close()
    if (!running) return
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLane(state, -1)
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveLane(state, 1)
    if (e.key.startsWith('Arrow')) e.preventDefault()
  })
  let touchX = null
  canvas.addEventListener('pointerdown', (e) => {
    touchX = e.clientX
  })
  canvas.addEventListener('pointerup', (e) => {
    if (!running || touchX === null) return
    const dx = e.clientX - touchX
    const r = canvas.getBoundingClientRect()
    // a swipe, or a tap on the left or right half
    if (Math.abs(dx) > 24) moveLane(state, dx > 0 ? 1 : -1)
    else moveLane(state, e.clientX < r.left + r.width / 2 ? -1 : 1)
    touchX = null
  })
  menu.querySelectorAll('.game-vehicle').forEach((b) =>
    b.addEventListener('click', () => {
      vehicle = b.dataset.vehicle
      menu.querySelectorAll('.game-vehicle').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      state = newGame(vehicle)
      audio.sfx.click()
    }),
  )
  root.querySelectorAll('[data-game="start"]').forEach((b) => b.addEventListener('click', begin))
  root.querySelector('[data-game="close"]').addEventListener('click', close)
  root.addEventListener('click', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('resize', () => !root.hidden && fit())

  return { open, close }
}
