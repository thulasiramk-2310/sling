// The 3D world. Builds everything (reporting progress to the loader), then each frame
// moves the auto and camera along the road to match where you have scrolled.
import * as THREE from 'three'
import { createAuto } from './auto.js'
import { buildChennai } from './landmarks/chennai.js'
import { buildKanchipuram } from './landmarks/kanchipuram.js'
import { buildMadurai } from './landmarks/madurai.js'
import { buildMamallapuram } from './landmarks/mamallapuram.js'
import { buildRameswaram } from './landmarks/rameswaram.js'
import { quality } from './quality.js'
import { createRoute, STOPS } from './route.js'
import { createPost } from './post.js'
import { createSky } from './sky.js'
import { phaseAt, sample } from './timeline.js'
import { clamp, setNight, smooth } from './util.js'
import { buildGround, buildLamps, buildPalms, buildParticles, buildRoad, buildSea, buildTown } from './world.js'

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))

export async function createScene({ canvas, report }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.low, powerPreference: 'high-performance' })
  renderer.setPixelRatio(quality.pixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  // Soft sun shadows give depth (desktop only).
  renderer.shadowMap.enabled = !quality.low
  renderer.shadowMap.type = THREE.PCFShadowMap
  const scene = new THREE.Scene()
  // Haze that thickens with distance, tinted by the time of day.
  scene.fog = new THREE.FogExp2(0xffffff, 0.0042)
  const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 1600)

  // Lights: sky and ground fill, and one directional light for the sun (then the moon).
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  if (!quality.low) {
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 600 })
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.5
    sun.shadow.radius = 3
  }
  scene.add(hemi, sun, sun.target)

  const steps = [
    ['Laying the road', (c) => Object.assign(c, { route: createRoute() })],
    ['Painting the sky', (c) => Object.assign(c, { sky: createSky(scene) })],
    ['Raising the land and sea', (c) => Object.assign(c, { sea: buildSea(scene), ground: buildGround(scene, c.route), road: buildRoad(scene, c.route) })],
    ['Planting palms', (c) => (buildPalms(scene, c.route), Object.assign(c, { lamps: buildLamps(scene, c.route) }))],
    ['Building the city and towns', (c) => {
      buildTown(scene, c.route, { from: 0.005, to: 0.11, count: quality.buildings, minH: 8, maxH: 26, seed: 3, lateral: [22, 90], side: -1 })
      buildTown(scene, c.route, { from: 0.52, to: 0.76, count: quality.houses, minH: 3, maxH: 7, seed: 9, flat: true, lateral: [16, 110] })
    }],
    ['Chennai', (c) => (c.stops = [buildChennai({ scene, route: c.route, u: STOPS[0] })])],
    ['Mamallapuram', (c) => c.stops.push(buildMamallapuram({ scene, route: c.route, u: STOPS[1] }))],
    ['Kanchipuram', (c) => c.stops.push(buildKanchipuram({ scene, route: c.route, u: STOPS[2] }))],
    ['Madurai', (c) => c.stops.push(buildMadurai({ scene, route: c.route, u: STOPS[3] }))],
    ['Rameswaram', (c) => c.stops.push(buildRameswaram({ scene, route: c.route, u: STOPS[4] }))],
    ['Warming up the engine', (c) => {
      c.auto = createAuto()
      c.auto.attachPuffs(scene)
      scene.add(c.auto.root)
      c.dust = buildParticles(scene)
    }],
  ]
  const ctx = {}
  for (let i = 0; i < steps.length; i++) {
    steps[i][1](ctx)
    report((i + 1) / steps.length, steps[i][0])
    await nextFrame()
  }
  const { route, sky, sea, auto, dust, stops } = ctx

  // Everything solid casts and catches shadows, except the ground and road (which only catch them).
  if (!quality.low)
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.noShadow) return
      o.castShadow = !o.userData.receiveOnly
      o.receiveShadow = true
    })
  const post = quality.low ? null : createPost(renderer, scene, camera)

  // --- per-frame state ---
  let target = 0 // where the scroll wants us (0..1 along the road)
  let u = 0 // where we really are (smoothed)
  let speed = 0 // 0..1, how fast we are moving
  let dir = 1
  let prevTan = new THREE.Vector3(0, 0, -1)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  let paused = false
  let time = 0

  const cam = route.sample()
  const car = route.sample()
  const look = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  let frames = 0
  let slow = 0

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    post?.setSize(w, h)
    camera.aspect = w / h
    // a taller phone screen needs a wider view to keep the road in frame
    camera.fov = w / h < 0.8 ? 68 : 46
    camera.updateProjectionMatrix()
  }
  resize()

  // How close we are to each stop (1 at the stop), to turn the camera toward its landmark.
  const stopWeight = (i) => 1 - smooth(0.0, 0.055, Math.abs(u - STOPS[i]))

  function frame(dt) {
    if (paused) return
    dt = Math.min(dt, 0.1)
    time += dt
    const before = u
    u += (target - u) * (1 - Math.exp(-dt * 5.5))
    const v = (u - before) / Math.max(dt, 0.001)
    if (Math.abs(v) > 0.00005) dir = Math.sign(v)
    speed += (clamp(Math.abs(v) / 0.06, 0, 1) - speed) * Math.min(1, dt * 8)

    // The auto sits on the road; the camera follows behind it.
    route.at(u, car)
    route.at(Math.max(0, u - 0.012), cam)
    auto.root.position.copy(car.pos)
    auto.root.lookAt(car.pos.x + car.tan.x, car.pos.y + car.tan.y, car.pos.z + car.tan.z)
    auto.root.updateMatrixWorld()
    const turn = prevTan.x * car.tan.z - prevTan.z * car.tan.x
    prevTan.copy(car.tan)

    // Mouse parallax (desktop only), eased.
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3)
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3)
    const par = quality.parallax ? 1 : 0

    camera.position.copy(cam.pos)
    camera.position.addScaledVector(cam.right, -1.7 + mouse.sx * 1.6 * par)
    camera.position.y += 3.0 - mouse.sy * 0.7 * par
    // look ahead of the auto, and swing toward the landmark when near a stop
    look.copy(car.pos).addScaledVector(car.tan, 9)
    look.y += 1.6
    let w = 0
    let focus = null
    for (let i = 0; i < STOPS.length; i++) {
      const sw = stopWeight(i)
      if (sw > w) {
        w = sw
        focus = stops[i].focus
      }
    }
    lookTarget.copy(look)
    if (focus) lookTarget.lerp(focus, w * 0.62)
    camera.lookAt(lookTarget)
    camera.fov += ((camera.aspect < 0.8 ? 68 : 46) + speed * 8 - camera.fov) * Math.min(1, dt * 4)
    camera.updateProjectionMatrix()

    // Day, dusk and night for this part of the road.
    const p = sample(u)
    sky.update(p, camera.position, time, u)
    hemi.color.setRGB(...p.hemiSky)
    hemi.groundColor.setRGB(...p.hemiGround)
    hemi.intensity = p.hemiI
    sun.color.setRGB(...p.light)
    sun.intensity = p.lightI
    // the sun (and its shadow box) follows the auto
    sun.target.position.copy(car.pos).addScaledVector(car.tan, 30)
    sun.position.copy(sun.target.position).addScaledVector(sky.lightDir, 300)
    sun.target.updateMatrixWorld()
    scene.fog.color.setRGB(...p.fog)
    scene.fog.density = (quality.low ? 0.0042 : 0.0026) * (1 + p.glowAmt * 0.3)
    setNight(p.night)
    sea.update(time, p, sky.lightDir)
    renderer.toneMappingExposure = 1.1 + p.night * 0.25

    auto.update(dt, speed, dir, turn, time, p.night)
    dust.update(camera.position, time, p.night)
    ctx.lamps.setNight(p.night)
    stops.forEach((s) => s.update(time, p.night))

    if (post) {
      post.update(p, time)
      post.render()
    } else renderer.render(scene, camera)

    // Lower the resolution if the frame rate sags (and raise it again when there is room).
    frames++
    slow += dt > 0.034 ? 1 : dt < 0.019 ? -1 : 0
    if (frames % 90 === 0) {
      const ratio = renderer.getPixelRatio()
      if (slow > 30 && ratio > 0.75) renderer.setPixelRatio(Math.max(0.75, ratio - 0.2))
      else if (slow < -60 && ratio < quality.pixelRatio) renderer.setPixelRatio(Math.min(quality.pixelRatio, ratio + 0.1))
      slow = 0
      resize()
    }
  }

  // Draw once so the first frame is ready behind the loading screen.
  target = u = 0.02
  frame(0.016)

  return {
    frame,
    resize,
    setTarget: (t) => (target = clamp(t, 0, 1)),
    // Jump straight to a place (used after a page transition, so the auto doesn't drive the whole way).
    jump: (t) => (target = u = clamp(t, 0, 1)),
    setMouse: (x, y) => ((mouse.x = x), (mouse.y = y)),
    setPaused: (p) => (paused = p),
    // speed 0..1 and the signed direction, for the engine sound
    motion: () => ({ speed, dir }),
    position: () => u,
    phase: () => phaseAt(u),
  }
}
