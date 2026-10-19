// The 3D world. Builds everything (reporting progress to the loader), then each frame
// moves the auto and camera along the road to match where you have scrolled.
import * as THREE from 'three'
import { createAuto } from './auto.js'
import { buildChennai } from './landmarks/chennai.js'
import { buildMadurai } from './landmarks/madurai.js'
import { buildMamallapuram } from './landmarks/mamallapuram.js'
import { buildRameswaram } from './landmarks/rameswaram.js'
import { buildThanjavur } from './landmarks/thanjavur.js'
import { quality } from './quality.js'
import { createRoute, STOPS } from './route.js'
import { loadModels } from './models.js'
import { createPost } from './post.js'
import { createSky } from './sky.js'
import { phaseAt, sample } from './timeline.js'
import { clamp, setNight, smooth } from './util.js'
import { buildGround, buildLamps, buildPalms, buildParticles, buildRoad, buildSea, buildTown } from './world.js'

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))

export async function createScene({ canvas, report, onCredits = () => {} }) {
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
  let hemiScale = 1
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
    ['Planting palms', (c) => Object.assign(c, { palms: buildPalms(scene, c.route), lamps: buildLamps(scene, c.route) })],
    ['Building the city and towns', (c) => {
      buildTown(scene, c.route, { from: 0.005, to: 0.11, count: quality.buildings, minH: 8, maxH: 26, seed: 3, lateral: [22, 90], side: -1 })
      buildTown(scene, c.route, { from: 0.52, to: 0.76, count: quality.houses, minH: 3, maxH: 7, seed: 9, flat: true, lateral: [16, 110] })
    }],
    ['Chennai', (c) => (c.stops = [buildChennai({ scene, route: c.route, u: STOPS[0] })])],
    ['Mamallapuram', (c) => c.stops.push(buildMamallapuram({ scene, route: c.route, u: STOPS[1] }))],
    ['Thanjavur', (c) => c.stops.push(buildThanjavur({ scene, route: c.route, u: STOPS[2] }))],
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
  const post = quality.low ? null : createPost(renderer, scene, camera, { hide: [sky.group, sea.mesh, ctx.palms.crowns] })
  // Real 3D models, if any were added to public/models (loaded in the background).
  loadModels([...stops.flatMap((s) => s.slots ?? []), { name: 'auto', group: auto.body, length: 2.7 }]).then(onCredits)

  // Light from the sky itself (image-based lighting), so stone, paint and metal pick up the time of day.
  const env = quality.low ? null : createSkyEnvironment(renderer, sky)
  if (env) {
    scene.environmentIntensity = 0.85
    hemiScale = 0.45
  }

  // --- per-frame state ---
  let target = 0 // where the scroll wants us (0..1 along the road)
  let u = 0 // where the auto really is
  let vel = 0 // how fast it is going (road per second)
  let speed = 0 // 0..1, for wheels, sound and camera
  let dir = 1
  let turnS = 0
  const prevTan = new THREE.Vector3(0, 0, -1)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  let paused = false
  let time = 0

  // The auto drives like a vehicle: it accelerates and brakes smoothly and has a top speed,
  // so a hard flick of the scroll wheel becomes a quick drive rather than a teleport.
  const TOP_SPEED = 0.034 // road per second (about 43 m/s across the whole trip)
  const ACCEL = 0.03

  const cam = route.sample()
  const car = route.sample()
  const look = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  const lookSmooth = new THREE.Vector3()
  const camGoal = new THREE.Vector3()
  const camSmooth = new THREE.Vector3()
  let first = true
  let frames = 0
  let dtSum = 0
  let dtCount = 0
  let lastCheck = performance.now()
  let fastStreak = 0

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)
    post?.setSize(w, h)
    camera.aspect = w / h
    // a taller phone screen needs a wider view to keep the road in frame
    camera.fov = w / h < 0.8 ? 68 : 44
    camera.updateProjectionMatrix()
  }
  resize()

  // How close we are to each stop (1 at the stop), to turn the camera toward its landmark.
  const stopWeight = (i) => 1 - smooth(0.0, 0.06, Math.abs(u - STOPS[i]))
  const ease = (rate, dt) => 1 - Math.exp(-rate * dt)

  function frame(dt) {
    if (paused) return
    dt = Math.min(dt, 0.1)
    time += dt

    // Drive toward where the scroll wants us, braking as we arrive.
    const gap = target - u
    const want = clamp(gap * 1.6, -TOP_SPEED, TOP_SPEED)
    vel += clamp(want - vel, -ACCEL * dt, ACCEL * dt)
    if (Math.abs(gap) < 0.0004 && Math.abs(vel) < 0.002) vel *= 0.8
    u = clamp(u + vel * dt, 0, 1)
    if (Math.abs(vel) > 0.0004) dir = Math.sign(vel)
    speed = clamp(Math.abs(vel) / TOP_SPEED, 0, 1)

    // The auto sits on the road; the camera follows behind it.
    route.at(u, car)
    route.at(Math.max(0, u - 0.011), cam)
    auto.root.position.copy(car.pos)
    auto.root.lookAt(car.pos.x + car.tan.x, car.pos.y + car.tan.y, car.pos.z + car.tan.z)
    auto.root.updateMatrixWorld()
    const turn = (prevTan.x * car.tan.z - prevTan.z * car.tan.x) / Math.max(dt, 0.001)
    prevTan.copy(car.tan)
    turnS += (clamp(turn, -0.6, 0.6) - turnS) * ease(3, dt)

    // Mouse parallax (desktop only), eased.
    mouse.sx += (mouse.x - mouse.sx) * ease(2.5, dt)
    mouse.sy += (mouse.y - mouse.sy) * ease(2.5, dt)
    const par = quality.parallax ? 1 : 0

    // which landmark are we near?
    let w = 0
    let focus = null
    for (let i = 0; i < STOPS.length; i++) {
      const sw = stopWeight(i)
      if (sw > w) {
        w = sw
        focus = stops[i].focus
      }
    }
    // At a stop the camera rises and steps out a little to frame the landmark; on the move it sits low behind the auto.
    // When parked, it breathes: a slow drift so the scene never freezes.
    const still = 1 - smooth(0.05, 0.3, speed)
    camGoal.copy(cam.pos)
    camGoal.addScaledVector(cam.right, -1.8 - w * 2.2 + mouse.sx * 1.4 * par + Math.sin(time * 0.31) * 0.5 * still)
    camGoal.y += 2.7 + w * 2.6 - mouse.sy * 0.6 * par + Math.sin(time * 0.23) * 0.25 * still + Math.sin(time * 9) * 0.02 * speed
    if (first) camSmooth.copy(camGoal)
    camSmooth.lerp(camGoal, ease(3.2, dt))
    camera.position.copy(camSmooth)

    look.copy(car.pos).addScaledVector(car.tan, 10)
    look.y += 1.5
    lookTarget.copy(look)
    if (focus) lookTarget.lerp(focus, w * 0.6)
    if (first) lookSmooth.copy(lookTarget)
    lookSmooth.lerp(lookTarget, ease(2.4, dt))
    camera.lookAt(lookSmooth)
    // lean into bends, like a camera car
    camera.rotateZ(-turnS * 0.05)
    camera.fov += ((camera.aspect < 0.8 ? 68 : 44) + speed * 7 - camera.fov) * ease(3, dt)
    camera.updateProjectionMatrix()
    first = false

    // Day, dusk and night for this part of the road.
    const p = sample(u)
    sky.update(p, camera.position, time, u)
    hemi.color.setRGB(...p.hemiSky)
    hemi.groundColor.setRGB(...p.hemiGround)
    hemi.intensity = p.hemiI * hemiScale
    sun.color.setRGB(...p.light)
    sun.intensity = p.lightI
    // the sun (and its shadow box) follows the auto
    sun.target.position.copy(car.pos).addScaledVector(car.tan, 30)
    sun.position.copy(sun.target.position).addScaledVector(sky.lightDir, 300)
    sun.target.updateMatrixWorld()
    scene.fog.color.setRGB(...p.fog)
    scene.fog.density = (quality.low ? 0.0042 : 0.0024) * (1 + p.glowAmt * 0.3)
    setNight(p.night)
    sea.update(time, p, sky.lightDir)
    renderer.toneMappingExposure = 1.05 + p.night * 0.25
    if (env && frames % 20 === 0) env.update(u, scene)

    auto.update(dt, speed, dir, turnS * 0.02, time, p.night)
    dust.update(camera.position, time, p.night)
    ctx.lamps.setNight(p.night)
    stops.forEach((s) => s.update(time, p.night))

    if (post) {
      post.update(p, time)
      post.render()
    } else renderer.render(scene, camera)

    // Every couple of seconds, check the frame rate. If it sags, first drop ambient occlusion, then lower
    // the resolution; raise the resolution again when there is room.
    frames++
    dtSum += dt
    dtCount++
    const now = performance.now()
    if (quality.adaptive && now - lastCheck > 2500 && dtCount > 3) {
      const avg = dtSum / dtCount
      const ratio = renderer.getPixelRatio()
      if (avg > 0.034) {
        fastStreak = 0
        if (post?.aoOn()) post.setAO(false)
        else if (ratio > 0.75) {
          renderer.setPixelRatio(Math.max(0.75, ratio - 0.25))
          resize()
        }
      } else if (avg < 0.019 && ratio < quality.pixelRatio && ++fastStreak > 2) {
        renderer.setPixelRatio(Math.min(quality.pixelRatio, ratio + 0.1))
        resize()
        fastStreak = 0
      }
      dtSum = dtCount = 0
      lastCheck = now
    }
  }

  // Draw once so the first frame is ready behind the loading screen.
  target = u = 0.02
  env?.update(u, scene, true)
  frame(0.016)

  return {
    frame,
    resize,
    setTarget: (t) => (target = clamp(t, 0, 1)),
    // Jump straight to a place (used after a page transition, so the auto doesn't drive the whole way).
    jump: (t) => {
      target = u = clamp(t, 0, 1)
      vel = 0
      first = true
      env?.update(u, scene, true)
    },
    setMouse: (x, y) => ((mouse.x = x), (mouse.y = y)),
    setPaused: (p) => (paused = p),
    // speed 0..1 and the signed direction, for the engine sound
    motion: () => ({ speed, dir }),
    position: () => u,
    phase: () => phaseAt(u),
  }
}

// Renders the sky dome into a lighting map now and then (only when we have moved), for image-based lighting.
function createSkyEnvironment(renderer, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.dome.material))
  let rt = null
  let lastU = -1
  return {
    update(u, scene, force = false) {
      if (!force && Math.abs(u - lastU) < 0.004) return
      lastU = u
      // the sky is a smooth gradient, so a small map is plenty (and cheap to refresh)
      const next = pmrem.fromScene(envScene, 0, 0.1, 400, { size: 64 })
      scene.environment = next.texture
      rt?.dispose()
      rt = next
    },
  }
}
