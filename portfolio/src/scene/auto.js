// The yellow and black auto-rickshaw, built from curved side profiles (like the real three-wheeler):
// a rounded front cowl, the rear passenger tub, a black canvas hood, chrome lamp and mirrors, real tyres,
// a yellow Tamil Nadu commercial number plate, and a driver in a khaki shirt.
// Its front faces local +Z. update() makes it react to how fast you scroll.
import * as THREE from 'three'
import { glowTexture } from './textures.js'
import { quality } from './quality.js'
import { clamp, glow, smooth, surface } from './util.js'

const UP = new THREE.Vector3(0, 1, 0)

// Extrudes a side profile (z forward, y up) across the width of the vehicle, with soft rounded edges.
function profile(points, width, mat, bevel = 0.05) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 })
  geo.translate(0, 0, -(width - bevel * 2) / 2)
  geo.rotateY(-Math.PI / 2) // shape x becomes forward (+Z), extrusion becomes width (X)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

function plateTexture(text) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4c20d'
  ctx.fillRect(0, 0, 256, 64)
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 4
  ctx.strokeRect(3, 3, 250, 58)
  ctx.fillStyle = '#111'
  ctx.font = 'bold 34px "DM Sans Variable", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 34)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function wheel(radius, width, rubber, rim, chrome) {
  const g = new THREE.Group()
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(radius - width * 0.45, width * 0.5, 12, 28), rubber)
  tyre.rotation.y = Math.PI / 2
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width * 0.7, 20), rim)
  disc.rotation.z = Math.PI / 2
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width * 0.85, 12), chrome)
  cap.rotation.z = Math.PI / 2
  g.add(tyre, disc, cap)
  // bolts, so the spin is visible
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.035, 0.035), chrome)
    const a = (i / 4) * Math.PI * 2
    b.position.set(0, Math.sin(a) * radius * 0.36, Math.cos(a) * radius * 0.36)
    g.add(b)
  }
  return g
}

export function createAuto() {
  const root = new THREE.Group() // placed and turned along the road
  const body = new THREE.Group() // pitches and bounces on its own
  root.add(body)

  const paint = quality.low
    ? surface({ color: 0xf2b705 })
    : new THREE.MeshPhysicalMaterial({ color: 0xf4b400, roughness: 0.42, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.12 })
  const canvasMat = surface({ color: 0x141416, roughness: 0.92, side: THREE.DoubleSide })
  const blackTrim = surface({ color: 0x18181b, roughness: 0.55 })
  const chrome = surface({ color: 0xd8dade, metalness: 1, roughness: 0.18 })
  const rubber = surface({ color: 0x121214, roughness: 0.82 })
  const rim = surface({ color: 0x2a2a2e, metalness: 0.6, roughness: 0.4 })
  const seat = surface({ color: 0x3a1f1c, roughness: 0.5 })
  const glass = surface({ color: 0xbfd9e6, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide })

  // rear passenger tub
  const tub = profile(
    [
      [-1.18, 0.42],
      [-1.25, 0.7],
      [-1.18, 1.0],
      [-1.02, 1.05],
      [-0.36, 1.05],
      [-0.3, 0.42],
    ],
    1.32,
    paint,
    0.06,
  )
  body.add(tub)
  // front cowl, narrower, rounding down to the nose
  const cowl = profile(
    [
      [0.42, 0.42],
      [0.42, 1.12],
      [0.62, 1.2],
      [0.95, 1.16],
      [1.2, 0.98],
      [1.31, 0.72],
      [1.27, 0.5],
      [1.12, 0.42],
    ],
    0.96,
    paint,
    0.07,
  )
  body.add(cowl)
  // black lower skirt and floor between the two
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.14, 2.42), blackTrim)
  skirt.position.set(0, 0.42, 0.05)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 0.8), blackTrim)
  floor.position.set(0, 0.5, 0.06)
  body.add(skirt, floor)
  // a thin black stripe along the tub
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.86), blackTrim)
  stripe.position.set(0, 0.86, -0.7)
  body.add(stripe)

  // canvas hood: roof and rear panel in one curved shell
  const hood = profile(
    [
      [0.76, 1.58],
      [0.56, 1.84],
      [-0.95, 1.87],
      [-1.2, 1.72],
      [-1.27, 1.1],
      [-1.19, 1.1],
      [-1.14, 1.68],
      [-0.92, 1.79],
      [0.52, 1.77],
      [0.69, 1.56],
    ],
    1.4,
    canvasMat,
    0.03,
  )
  body.add(hood)
  // rolled-up side curtains
  for (const s of [-1, 1]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), canvasMat)
    roll.rotation.x = Math.PI / 2
    roll.position.set(s * 0.68, 1.79, -0.22)
    body.add(roll)
  }
  // pillars and windscreen
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8), blackTrim)
    post.position.set(s * 0.6, 1.47, 0.7)
    post.rotation.x = -0.18
    body.add(post)
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.56), glass)
  screen.position.set(0, 1.47, 0.71)
  screen.rotation.x = -0.18
  screen.userData.noShadow = true
  body.add(screen)

  // handlebar and round mirrors
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 8), chrome)
  bar.rotation.z = Math.PI / 2
  bar.position.set(0, 1.26, 0.52)
  body.add(bar)
  for (const s of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 6), chrome)
    stalk.position.set(s * 0.56, 1.42, 0.66)
    stalk.rotation.z = s * 0.4
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), chrome)
    mirror.rotation.x = Math.PI / 2
    mirror.position.set(s * 0.64, 1.58, 0.67)
    body.add(stalk, mirror)
  }

  // seats and the driver
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.16, 0.56), seat)
  bench.position.set(0, 1.12, -0.72)
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.48, 0.12), seat)
  back.position.set(0, 1.4, -1.02)
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), seat)
  driverSeat.position.set(0, 1.1, 0.04)
  body.add(bench, back, driverSeat)
  const shirt = surface({ color: 0x9b8a5e, roughness: 0.9 })
  const skin = surface({ color: 0x8a5a3c, roughness: 0.7 })
  const hair = surface({ color: 0x15100d, roughness: 0.9 })
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.34, 4, 10), shirt)
  torso.position.set(0, 1.42, 0.06)
  torso.rotation.x = 0.12
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), skin)
  head.position.set(0, 1.78, 0.1)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair)
  cap.position.set(0, 1.8, 0.09)
  body.add(torso, head, cap)
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 4, 8), shirt)
    arm.position.set(s * 0.26, 1.38, 0.32)
    arm.rotation.x = 1.15
    arm.rotation.z = s * -0.25
    body.add(arm)
  }

  // headlamp with chrome ring, indicators, tail lights and number plates
  const lampMat = glow(surface({ color: 0xfff6dc, emissive: 0xfff2c4, emissiveIntensity: 0, roughness: 0.1 }), 2.2)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), lampMat)
  lens.position.set(0, 0.98, 1.235)
  lens.rotation.x = -0.55
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 8, 24), chrome)
  ring.position.copy(lens.position)
  ring.rotation.x = -0.55
  body.add(lens, ring)
  const amber = glow(surface({ color: 0xffa21a, emissive: 0xff8a00, emissiveIntensity: 0 }), 0.8)
  for (const s of [-1, 1]) {
    const ind = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), amber)
    ind.position.set(s * 0.32, 1.08, 1.1)
    body.add(ind)
  }
  const tailMat = glow(surface({ color: 0xc8241c, emissive: 0xff2a20, emissiveIntensity: 0 }), 1.6)
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.03), tailMat)
    tail.position.set(s * 0.52, 0.86, -1.26)
    body.add(tail)
  }
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.115), new THREE.MeshBasicMaterial({ map: plateTexture('TN 09 AX 4218') }))
  rear.position.set(0, 0.62, -1.27)
  rear.rotation.y = Math.PI
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.09), new THREE.MeshBasicMaterial({ map: plateTexture('TN 09 AX 4218') }))
  front.position.set(0, 0.58, 1.3)
  front.rotation.x = -0.3
  body.add(rear, front)

  // headlight beam and road light at night
  const lamp = new THREE.SpotLight(0xffe2a8, 0, 34, 0.6, 0.9, 1.2)
  lamp.position.set(0, 1.0, 1.3)
  lamp.target.position.set(0, 0, 9)
  body.add(lamp, lamp.target)
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 7, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  )
  beam.rotation.x = -Math.PI / 2
  beam.position.set(0, 0.95, 4.8)
  beam.userData.noShadow = true
  body.add(beam)

  // wheels: one in front under a mudguard, two at the back
  const wheels = []
  const frontWheel = new THREE.Group()
  const fw = wheel(0.3, 0.14, rubber, rim, chrome)
  frontWheel.add(fw)
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 16, Math.PI), blackTrim)
  guard.rotation.y = Math.PI / 2
  frontWheel.add(guard)
  frontWheel.position.set(0, 0.3, 1.02)
  body.add(frontWheel)
  wheels.push(fw)
  for (const s of [-1, 1]) {
    const w = wheel(0.3, 0.17, rubber, rim, chrome)
    w.position.set(s * 0.66, 0.3, -0.82)
    body.add(w)
    wheels.push(w)
  }

  // soft contact shadow under the auto
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }))
  shade.rotation.x = -Math.PI / 2
  shade.position.y = 0.04
  shade.userData.noShadow = true
  root.add(shade)

  // a few puffs of exhaust
  const puffs = []
  if (quality.exhaust) {
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xb8b0a8, transparent: true, opacity: 0, depthWrite: false }))
      s.userData = { life: 1 }
      puffs.push(s)
    }
  }

  let pitch = 0
  let roll = 0
  let bounce = 0
  let bounceV = 0
  let lastSpeed = 0
  let nextPuff = 0
  const tailPos = new THREE.Vector3()

  return {
    root,
    body,
    attachPuffs(scene) {
      puffs.forEach((p) => scene.add(p))
    },
    // speed: 0..1 how fast it is going; dir: +1 forward, -1 reverse; turn: how sharply the road bends.
    update(dt, speed, dir, turn, time, night) {
      const spin = (dir * speed * 0.034 * 1270) / 0.3 // road speed / wheel radius
      wheels.forEach((w) => (w.rotation.x += spin * dt))
      // weight shifts back when accelerating, forward when braking
      const accel = (speed - lastSpeed) / Math.max(dt, 0.001)
      lastSpeed = speed
      pitch += (clamp(-accel * 0.035, -0.05, 0.05) - pitch) * Math.min(1, dt * 5)
      roll += (clamp(-turn * 4, -0.07, 0.07) - roll) * Math.min(1, dt * 4)
      // a springy suspension excited by the road and the engine
      const road = (Math.sin(time * 17) + Math.sin(time * 23.7) * 0.6) * 0.004 * speed
      bounceV += (-bounce * 220 - bounceV * 14 + road * 900) * dt
      bounce += bounceV * dt
      const idle = Math.sin(time * 52) * 0.0025 * (1 - speed * 0.6)
      body.position.y = bounce + idle
      body.rotation.x = pitch + bounce * 0.6
      body.rotation.z = roll + Math.sin(time * 41) * 0.0015
      frontWheel.rotation.y = clamp(turn * 10, -0.35, 0.35)
      const lights = smooth(0.3, 0.8, night)
      lamp.intensity = lights * 22
      beam.material.opacity = lights * 0.08
      // puffs rise from the exhaust and fade
      if (puffs.length) {
        nextPuff -= dt
        if (nextPuff <= 0 && speed > 0.05) {
          const p = puffs.find((q) => q.userData.life >= 1)
          if (p) {
            tailPos.set(0.42, 0.45, -1.28).applyMatrix4(root.matrixWorld)
            p.position.copy(tailPos)
            p.userData.life = 0
          }
          nextPuff = 0.11 - speed * 0.06
        }
        for (const p of puffs) {
          if (p.userData.life >= 1) continue
          p.userData.life += dt * 1.3
          p.position.addScaledVector(UP, dt * 0.6)
          p.scale.setScalar(0.3 + p.userData.life * 1.2)
          p.material.opacity = Math.max(0, 0.25 * (1 - p.userData.life))
          if (p.userData.life >= 1) p.material.opacity = 0
        }
      }
    },
  }
}
