// The yellow and black auto-rickshaw. Built from simple shapes, so it needs no model file.
// Its front faces local +Z. update() makes it react to how fast you scroll.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { glowTexture } from './textures.js'
import { quality } from './quality.js'
import { clamp, glow, lambert } from './util.js'

const YELLOW = 0xf2b705
const BLACK = 0x17171a

export function createAuto() {
  const root = new THREE.Group() // placed and turned along the road
  const body = new THREE.Group() // pitches and bounces on its own
  root.add(body)

  const yellow = lambert(YELLOW)
  const black = lambert(BLACK)
  const rounded = (w, h, d, mat, x, y, z, r = 0.07) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat)
    m.position.set(x, y, z)
    body.add(m)
    return m
  }

  // Lower body: black skirt, yellow cowl at the front, yellow tub at the back.
  rounded(1.3, 0.16, 2.35, black, 0, 0.42, -0.1)
  rounded(0.92, 0.55, 0.95, yellow, 0, 0.76, 0.85, 0.16)
  rounded(1.32, 0.6, 1.3, yellow, 0, 0.78, -0.5)
  rounded(1.36, 0.08, 1.34, black, 0, 1.1, -0.5, 0.03)

  // Curved black roof on four thin pillars.
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.95, 28, 1, true, Math.PI - 0.52, 1.04), black)
  roof.material = new THREE.MeshLambertMaterial({ color: BLACK, side: THREE.DoubleSide })
  roof.rotation.x = Math.PI / 2
  roof.position.set(0, 0.38, -0.1)
  body.add(roof)
  for (const [x, z, h] of [
    [-0.62, 0.62, 0.75],
    [0.62, 0.62, 0.75],
    [-0.62, -1.05, 0.72],
    [0.62, -1.05, 0.72],
  ])
    rounded(0.06, h, 0.06, black, x, 1.46, z, 0.02)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.62), new THREE.MeshLambertMaterial({ color: 0x9fd0e6, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
  windshield.position.set(0, 1.6, 0.68)
  windshield.rotation.x = -0.18
  windshield.userData.noShadow = true
  body.add(windshield)

  // Seat and a driver in a khaki shirt.
  rounded(1.1, 0.16, 0.6, lambert(0x2a2024), 0, 1.0, -0.4)
  rounded(0.4, 0.58, 0.28, lambert(0x8c7a52), 0, 1.3, 0.28, 0.08)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), lambert(0x9a6a48))
  head.position.set(0, 1.78, 0.3)
  body.add(head)
  rounded(0.7, 0.04, 0.04, black, 0, 1.28, 0.7, 0.01) // handlebar

  // Lights. The headlight glows at night; the tail light is red.
  const headMat = glow(new THREE.MeshLambertMaterial({ color: 0xfff2c4, emissive: 0xfff2c4, emissiveIntensity: 0.3 }), 1.6)
  const head1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), headMat)
  head1.position.set(0, 0.92, 1.34)
  body.add(head1)
  const tailMat = glow(new THREE.MeshLambertMaterial({ color: 0xff3b30, emissive: 0xff2a20, emissiveIntensity: 0.4 }), 1.4)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), tailMat)
  tail.position.set(0, 0.92, -1.17)
  body.add(tail)

  // Light on the road in front at night.
  const lamp = new THREE.PointLight(0xffe2a8, 0, 24, 1.4)
  lamp.position.set(0, 1.0, 2.2)
  body.add(lamp)
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 7, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  )
  beam.rotation.x = -Math.PI / 2
  beam.userData.noShadow = true
  beam.position.set(0, 0.9, 4.8)
  body.add(beam)

  // Wheels: one at the front, two at the back.
  const tire = lambert(0x161618)
  const hub = lambert(YELLOW)
  const wheels = []
  const makeWheel = (x, z, w) => {
    const g = new THREE.Group()
    const spin = new THREE.Group()
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, w, 18), tire)
    t.rotation.z = Math.PI / 2
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, w + 0.02, 10), hub)
    h.rotation.z = Math.PI / 2
    // a spoke bar so the spin is visible
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.05, 0.4), black)
    spin.add(t, h, bar)
    g.add(spin)
    g.position.set(x, 0.29, z)
    body.add(g)
    wheels.push(spin)
    return g
  }
  const front = makeWheel(0, 1.1, 0.13)
  makeWheel(-0.66, -0.85, 0.17)
  makeWheel(0.66, -0.85, 0.17)

  // Soft shadow on the road (cheaper than real shadows).
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }))
  shade.rotation.x = -Math.PI / 2
  shade.userData.noShadow = true
  shade.position.y = 0.04
  root.add(shade)

  // A few puffs of exhaust.
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
  let lastSpeed = 0
  let nextPuff = 0

  return {
    root,
    attachPuffs(scene) {
      puffs.forEach((p) => scene.add(p))
    },
    // speed: 0..1 how fast the scroll is; dir: +1 forward, -1 reverse; turn: how sharply the road bends.
    update(dt, speed, dir, turn, time, night) {
      const spin = dir * (speed * 26 + 0.8)
      wheels.forEach((w) => (w.rotation.x += spin * dt))
      const accel = (speed - lastSpeed) / Math.max(dt, 0.001)
      lastSpeed = speed
      pitch += (clamp(-accel * 0.01, -0.08, 0.08) - pitch) * Math.min(1, dt * 6)
      roll += (clamp(turn * 6, -0.12, 0.12) - roll) * Math.min(1, dt * 5)
      const rumble = Math.sin(time * 47) * 0.006 * (0.4 + speed) + Math.sin(time * 13) * 0.01 * speed
      body.position.y = Math.abs(rumble)
      body.rotation.x = pitch + rumble * 0.4
      body.rotation.z = roll
      front.rotation.y = clamp(-turn * 8, -0.4, 0.4)
      lamp.intensity = night * 14
      beam.material.opacity = night * 0.1
      // Puffs rise from the back and fade.
      if (puffs.length) {
        nextPuff -= dt
        if (nextPuff <= 0 && speed > 0.08) {
          const p = puffs.find((q) => q.userData.life >= 1)
          if (p) {
            const tailPos = new THREE.Vector3(0.45, 0.45, -1.25).applyMatrix4(root.matrixWorld)
            p.position.copy(tailPos)
            p.userData.life = 0
          }
          nextPuff = 0.09 - speed * 0.05
        }
        for (const p of puffs) {
          if (p.userData.life >= 1) continue
          p.userData.life += dt * 1.4
          p.position.y += dt * 0.7
          p.scale.setScalar(0.35 + p.userData.life * 1.3)
          p.material.opacity = Math.max(0, 0.32 * (1 - p.userData.life))
          if (p.userData.life >= 1) p.material.opacity = 0
        }
      }
    },
  }
}
