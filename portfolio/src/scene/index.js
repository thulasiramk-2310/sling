// The 3D world. Builds everything (reporting progress to the loader), then each frame
// moves the auto and camera along the road to match where you have scrolled.
import * as THREE from 'three'
import { createAuto } from './auto.js'
import { createRamAvatar } from './avatar.js'
import { vehicleAt, introductionActor } from './intro-actors.js'
import { createFrameBudget } from './frame-budget.js'
import { renderProfile } from './render-profile.js'
import { updateDetailLods } from './detail-lod.js'
import { storyAt } from './story.js'
import { buildIntroBridge } from './landmarks/intro-bridge.js'
import { buildKanyakumari } from './landmarks/kanyakumari.js'
import { buildJourneyExhibits } from './interactions/journey-exhibits.js'
import { advanceDrive, DRIVE, journeyPace } from './drive.js'
import { createJourneyCamera, frameVehicle, journeyLens, journeyFar } from './camera.js'
import { batchStaticMeshes } from './batch.js'
import { createStreetEdges } from './street-edges.js'
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

export async function createScene({ canvas, report, onCredits = () => {}, onProject = () => {}, reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.low, powerPreference: 'high-performance' })
  renderer.setPixelRatio(quality.pixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.info.autoReset = false
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
    sun.shadow.normalBias = 0.08
    sun.shadow.radius = 3
  }
  const fill=new THREE.DirectionalLight(0xe1e9ee,.55)
  scene.add(hemi,sun,sun.target,fill,fill.target)

  const steps = [
    ['Laying the road', (c) => Object.assign(c, { route: createRoute() })],
    ['Painting the sky', (c) => Object.assign(c, { sky: createSky(scene) })],
    ['Raising the land and sea', (c) => Object.assign(c, { sea: buildSea(scene), ground: buildGround(scene, c.route), road: buildRoad(scene, c.route) })],
    ['Planting palms', (c) => Object.assign(c, { palms: buildPalms(scene, c.route), lamps: buildLamps(scene, c.route) })],
    ['Building the city and towns', (c) => {
      buildTown(scene, c.route, { from: 0.005, to: 0.11, count: quality.buildings, minH: 8, maxH: 26, seed: 3, lateral: [22, 90], side: -1 })
      buildTown(scene,c.route,{from:.028,to:.118,count:quality.low?8:18,seed:73,flat:false,side:-1,setback:185})
      buildTown(scene, c.route, { from: .115, to: .235, count: quality.houses, seed: 26, flat: true, setback: 12.5 })
      scene.add(createStreetEdges(c.route,.035,.115))
      scene.add(createStreetEdges(c.route))
      buildTown(scene, c.route, { from: 0.52, to: 0.76, count: quality.houses, minH: 3, maxH: 7, seed: 9, flat: true, lateral: [16, 110] })
    }],
    ['The opening bridge', (c) => { c.intro = buildIntroBridge(scene, c.route) }],
    ['Chennai', (c) => (c.stops = [buildChennai({ scene, route: c.route, u: STOPS[0] })])],
    ['Mamallapuram', (c) => c.stops.push(buildMamallapuram({ scene, route: c.route, u: STOPS[1], ground: c.ground }))],
    ['Thanjavur', (c) => c.stops.push(buildThanjavur({ scene, route: c.route, u: STOPS[2] }))],
    ['Madurai', (c) => c.stops.push(buildMadurai({ scene, route: c.route, u: STOPS[3] }))],
    ['Rameswaram', (c) => c.stops.push(buildRameswaram({ scene, route: c.route, u: STOPS[4] }))],
    ['Kanyakumari', (c) => c.stops.push(buildKanyakumari({ scene, route: c.route, u: STOPS[5] }))],
    ['Preparing the story', async (c) => { c.exhibits = await buildJourneyExhibits(scene, c.route) }],
    ['Warming up the engine', (c) => {
      c.auto = createAuto(c.route.length)
      c.auto.root.userData.preserveAssembly = true
      c.auto.attachPuffs(scene)
      scene.add(c.auto.root)
      c.dust = buildParticles(scene)
      c.avatar = createRamAvatar()
      c.avatar.root.userData.preserveAssembly = true
      scene.add(c.avatar.root)
    }],
  ]
  const ctx = {}
  for (let i = 0; i < steps.length; i++) {
    await steps[i][1](ctx)
    report(((i + 1) / steps.length) * 0.9, steps[i][0])
    await nextFrame()
  }
  const { route, sky, sea, auto, dust, stops, avatar, exhibits } = ctx
  const cameraRoute = createJourneyCamera(route)
  // Finish optional assets before the first frame and AO visibility classification.
  // A successful model replacement no longer pops into an already visible landmark.
  onCredits(await loadModels([...stops.flatMap((s) => s.slots ?? []), { name: 'auto', group: auto.body, length: 2.7 }]))
  // Everything solid casts and catches shadows, except the ground and road (which only catch them).
  if (!quality.low)
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.noShadow) return
      o.castShadow = !o.userData.receiveOnly
      o.receiveShadow = true
    })
  // Batch the states that will actually render, rather than splitting otherwise
  // identical architecture by its temporary construction-time shadow flags.
  batchStaticMeshes(scene)
  report(1, 'Finishing the journey')
  // Opaque water must write AO depth: hiding it exposes submerged terrain and
  // multiplies its angular silhouette onto the otherwise continuous ocean.
  const post = quality.low ? null : createPost(renderer, scene, camera, { hide: [sky.group, ctx.palms.crowns] })

  // Light from the sky itself (image-based lighting), so stone, paint and metal pick up the time of day.
  const env = quality.low ? null : createSkyEnvironment(renderer, sky)
  let environmentDirty=true
  if (env) {
    scene.environmentIntensity = 0.45
    hemiScale = 0.65
  }

  // --- per-frame state ---
  let target = 0 // where the scroll wants us (0..1 along the road)
  let u = 0 // where the auto really is
  let vel = 0 // how fast it is going (road per second)
  let speed = 0 // 0..1, for wheels, sound and camera
  let currentStory = storyAt(0)
  let previousRoad = currentStory.road
  let discovered = []
  let dir = 1
  let turnS = 0
  const prevTan = new THREE.Vector3(0, 0, -1)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  let paused = false
  let time = 0

  // The auto drives like a vehicle: it accelerates and brakes smoothly and has a top speed,
  // so a hard flick of the scroll wheel becomes a quick drive rather than a teleport.
  const TOP_SPEED = DRIVE.speed

  const car = route.sample()
  const vehicleCenter = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  const lookSmooth = new THREE.Vector3()
  const camGoal = new THREE.Vector3()
  const camSmooth = new THREE.Vector3()
  let first = true
  let frames = 0
  const frameBudget=createFrameBudget(performance.now())
  document.addEventListener('visibilitychange',()=>frameBudget.reset(performance.now()))
  let fastStreak = 0
  let lastFPS = null
  let viewportHeight = 1

  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    viewportHeight = h
    renderer.setSize(w, h, false)
    post?.setSize(w, h)
    camera.aspect = w / h
    // a taller phone screen needs a wider view to keep the road in frame
    camera.fov = w / h < 0.8 ? 68 : 44
    camera.updateProjectionMatrix()
  }
  resize()

  const ease = (rate, dt) => 1 - Math.exp(-rate * dt)

  function frame(dt) {
    if (paused) return
    const measuredDelta = dt
    dt = Math.min(dt, 0.1)
    if (!reduced) time += dt

    // Drive toward where the scroll wants us, braking as we arrive.
    const drive = advanceDrive({ u, velocity: vel }, target, dt*journeyPace(u), reduced)
    u = drive.u
    vel = drive.velocity
    currentStory = storyAt(u)
    const roadVelocity = first ? 0 : (currentStory.road - previousRoad) / Math.max(dt, 1 / 120)
    previousRoad = currentStory.road
    if (Math.abs(roadVelocity) > .0004) dir = Math.sign(roadVelocity)
    speed = clamp(Math.abs(roadVelocity) / TOP_SPEED, 0, 1)

    // The auto sits on the road; the camera follows behind it.
    vehicleAt(route,u,car)
    auto.root.position.copy(car.pos)
    auto.root.up.copy(car.normal)
    auto.root.lookAt(car.pos.x + car.heading.x, car.pos.y + car.heading.y, car.pos.z + car.heading.z)
    auto.root.updateMatrixWorld()
    const turn = (prevTan.x * car.heading.z - prevTan.z * car.heading.x) / Math.max(dt, 0.001)
    prevTan.copy(car.heading)
    turnS += (clamp(turn, -0.6, 0.6) - turnS) * ease(3, dt)

    // Mouse parallax (desktop only), eased.
    mouse.sx += (mouse.x - mouse.sx) * ease(2.5, dt)
    mouse.sy += (mouse.y - mouse.sy) * ease(2.5, dt)
    const par = quality.parallax && !reduced ? 1 : 0

    // The actual auto remains in the foreground, with architecture above it.
    const still = reduced ? 0 : 1 - smooth(0.05, 0.3, speed)
    const pose = cameraRoute.sample(u, camera.aspect)
    camGoal.copy(pose.eye).addScaledVector(car.right, mouse.sx * 0.35 * par)
    camGoal.y += Math.sin(time * 0.23) * 0.08 * still - mouse.sy * 0.15 * par
    lookTarget.copy(pose.target)
    // Smooth relative camera motion, while carrying its position with the car.
    // Smoothing world positions alone left the camera tens of metres behind.
    cameraRoute.transport(camSmooth, lookSmooth)
    if (first || reduced) camSmooth.copy(camGoal)
    camSmooth.lerp(camGoal, ease(3.2, dt))
    camera.position.copy(camSmooth)
    if (first || reduced) lookSmooth.copy(lookTarget)
    lookSmooth.lerp(lookTarget, ease(2.4, dt))
    camera.lookAt(lookSmooth)
    // lean into bends, like a camera car
    if (!reduced) camera.rotateZ(-turnS * 0.05)
    const lens = journeyLens(camera.aspect,u,speed)
    if (first || reduced) camera.fov = lens
    else camera.fov += (lens - camera.fov) * ease(3, dt)
    camera.far=journeyFar(u,quality.low)
    camera.updateProjectionMatrix()
    vehicleCenter.copy(car.pos)
    vehicleCenter.y += 1
    vehicleCenter.addScaledVector(car.right, pose.portrait * .9)
    frameVehicle(camera, vehicleCenter, canvas.clientWidth, canvas.clientHeight, u, pose)
    // Choose repeated architectural detail once from the visitor's camera.
    // Water reflection and shadow cameras reuse that choice without toggling it.
    updateDetailLods(scene,camera,viewportHeight)
    first = false

    // Day, dusk and night for this part of the road.
    const p = sample(currentStory.road)
    sky.update(p, camera.position, time, currentStory.road)
    hemi.color.setRGB(...p.hemiSky)
    hemi.groundColor.setRGB(...p.hemiGround)
    hemi.intensity = p.hemiI * hemiScale
    if(env)scene.environmentIntensity=THREE.MathUtils.lerp(.45,.30,p.finalDawn)
    sun.color.setRGB(...p.light)
    sun.intensity = p.lightI * 1.15
    // Close introductions need the same shadow precision as sculpture visits.
    // Blend the target too: the travelling target sits thirty metres ahead.
    const introShadow=smooth(.195,.225,u)*(1-smooth(.285,.335,u))
    const shadowFocus=Math.max(introShadow,pose.visitWeight)
    sun.target.position.copy(car.pos).addScaledVector(car.tan, 30)
    sun.target.position.lerp(vehicleCenter,introShadow)
    sun.target.position.lerp(lookTarget,pose.visitWeight)
    if(!quality.low) {
      const extent=THREE.MathUtils.lerp(110,32,shadowFocus)
      if(Math.abs(sun.shadow.camera.right-extent)>.001) {
        Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent})
        sun.shadow.camera.updateProjectionMatrix()
      }
      sun.shadow.normalBias=THREE.MathUtils.lerp(.08,.014,shadowFocus)
      sun.shadow.bias=THREE.MathUtils.lerp(-.0004,-.00003,shadowFocus)
    }
    sun.position.copy(sun.target.position).addScaledVector(sky.lightDir, 300)
    sun.target.updateMatrixWorld()
    // A broad viewing-side bounce keeps the sculpted fronts readable when the
    // low sun is behind them. Follow the authored camera, not the inland side.
    fill.target.position.copy(lookTarget)
    fill.position.copy(camera.position);fill.position.y+=20
    fill.intensity=THREE.MathUtils.lerp(.7,.26,p.finalDawn)*(1-p.night*.78)
    fill.target.updateMatrixWorld()
    scene.fog.color.setRGB(...p.fog).lerp(new THREE.Color().setRGB(...p.horizon),THREE.MathUtils.lerp(.8,.15,p.finalDawn))
    scene.fog.density = THREE.MathUtils.lerp(quality.low ? .0025 : .0013,quality.low ? .00098 : .00085,p.finalDawn) * (1 + p.glowAmt * 0.3)
    setNight(p.night)
    sea.update(time, p, sky.lightDir)
    renderer.toneMappingExposure = .86 + p.night * .27
    // Paint the sky before baking its lighting map, including first frame and
    // explicit seeks. Baking during jump() used the previous destination's sky.
    if(env && (environmentDirty || frames%20===0)) {
      env.update(currentStory.road,scene,environmentDirty)
      environmentDirty=false
    }

    auto.update(reduced ? 0 : dt, speed, dir, reduced ? 0 : turnS * 0.02, time, p.night)
    const boarding = currentStory.progress < .5 ? currentStory.boarding : 0
    const actor=introductionActor(u,reduced)
    avatar.root.visible = (u > .185 && u < .325) || (u > .92 && u < .955)
    avatar.root.position.copy(car.pos).addScaledVector(car.heading,actor.along).addScaledVector(car.vehicleRight,actor.lateral)
    avatar.root.position.y+=actor.height+auto.body.position.y*boarding
    avatar.root.rotation.y=Math.atan2(car.heading.x,car.heading.z)-actor.heading
    avatar.update(time,boarding,reduced,actor)
    auto.driver.visible = u >= .325 && u <= .92
    discovered = exhibits.update(currentStory, time, camera)
    dust.update(camera.position, time, p.night)
    ctx.lamps.setNight(p.night)
    stops.forEach((s) => s.update(time, p.night))

    renderer.info.reset()
    if (post) {
      post.update(p, time)
      post.render()
    } else renderer.render(scene, camera)

    // Every couple of seconds, check the frame rate. If it sags, first drop ambient occlusion, then lower
    // the resolution; raise the resolution again when there is room.
    frames++
    const sampledFPS=frameBudget.sample(measuredDelta,performance.now(),!document.hidden)
    if(sampledFPS!==null)lastFPS=sampledFPS
    if (quality.adaptive && sampledFPS!==null) {
      const avg = 1 / sampledFPS
      const ratio = renderer.getPixelRatio()
      if (avg > 0.034) {
        fastStreak = 0
        if (post?.aoOn()) post.setAO(false)
        else if (sea.reflectionsOn()) sea.setReflections(false)
        else if (post?.bloomOn()) post.setBloom(false)
        else if (renderer.shadowMap.enabled) renderer.shadowMap.enabled = false
        else if (ratio > 0.75) {
          renderer.setPixelRatio(Math.max(0.75, ratio - 0.25))
          resize()
        }
      } else if (avg < 0.019 && ratio < quality.pixelRatio && ++fastStreak > 2) {
        renderer.setPixelRatio(Math.min(quality.pixelRatio, ratio + 0.1))
        resize()
        fastStreak = 0
      }
    }
  }

  // Draw once so the first frame is ready behind the loading screen.
  target = u = 0
  frame(0.016)

  canvas.addEventListener('pointerdown', event => exhibits.pointerDown(event))
  canvas.addEventListener('pointercancel',()=>exhibits.cancelPointer())
  // Complete the activation on click. Opening during touch pointerup lets the
  // following compatibility click land on a newly mounted dialog link.
  canvas.addEventListener('click', event => {
    if (paused || currentStory.stage !== 'projects' || !exhibits.tapped(event)) return
    const project = exhibits.point(event,camera,canvas)
    if (project !== null) onProject(project)
  })
  canvas.addEventListener('pointermove', event => {
    const hit = !paused && currentStory.stage === 'projects' && exhibits.point(event,camera,canvas) !== null
    canvas.style.cursor = hit ? 'pointer' : ''
  })
  return {
    frame,
    profile:()=>renderProfile(scene,camera),
    setEffects:settings=>{
      if(typeof settings.shadows==='boolean')renderer.shadowMap.enabled=settings.shadows
      if(typeof settings.reflections==='boolean')sea.setReflections(settings.reflections)
      if(typeof settings.ao==='boolean')post?.setAO(settings.ao)
      if(typeof settings.bloom==='boolean')post?.setBloom(settings.bloom)
    },
    resize,
    setTarget: (t) => (target = clamp(t, 0, 1)),
    // Jump straight to a place (used after a page transition, so the auto doesn't drive the whole way).
    jump: (t) => {
      target = u = clamp(t, 0, 1)
      currentStory = storyAt(u)
      previousRoad = currentStory.road
      exhibits.seek(currentStory.road)
      vel = 0
      first = true
      environmentDirty=true
    },
    setMouse: (x, y) => ((mouse.x = x), (mouse.y = y)),
    setPaused: (p) => (paused = p),
    setReducedMotion: (value) => { reduced = value; first = true },
    metrics: () => ({ frames, fps: lastFPS, environment:env?.sample()??null, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, dpr: renderer.getPixelRatio(), ao: post?.aoOn() ?? false, reflections: sea.reflectionsOn(), bloom: post?.bloomOn() ?? false, shadows: renderer.shadowMap.enabled }),
    // speed 0..1 and the signed direction, for the engine sound
    motion: () => ({ speed, dir }),
    position: () => u,
    story: () => ({ ...currentStory, discovered, skill:exhibits.skill(currentStory.road) }),
    exhibits: () => exhibits.targets.map((object,index) => {
      const position=object.getWorldPosition(new THREE.Vector3()).project(camera)
      return {index,x:(position.x+1)*canvas.clientWidth/2,y:(1-position.y)*canvas.clientHeight/2,visible:currentStory.stage==='projects' && Math.abs(position.x)<1 && Math.abs(position.y)<1 && position.z<1}
    }),
    phase: () => phaseAt(currentStory.road),
  }
}

// Renders the sky dome into a lighting map now and then (only when we have moved), for image-based lighting.
function createSkyEnvironment(renderer, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.dome.material))
  let rt = null
  let lastU = -1
  let lastTop=null
  return {
    sample:()=>({road:lastU,top:lastTop}),
    update(u, scene, force = false) {
      if (!force && Math.abs(u - lastU) < 0.004) return
      lastU = u
      lastTop=sky.dome.material.uniforms.top.value.toArray()
      envScene.fog=scene.fog
      // the sky is a smooth gradient, so a small map is plenty (and cheap to refresh)
      const next = pmrem.fromScene(envScene, 0, 0.1, 400, { size: 64 })
      scene.environment = next.texture
      rt?.dispose()
      rt = next
    },
  }
}
