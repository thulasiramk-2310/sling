// Sky dome, sun, moon, stars and clouds. update() paints them for the time of day at the current spot.
import * as THREE from 'three'
import { cloudTexture, glowTexture, moonTexture } from './textures.js'
import { quality } from './quality.js'
import { sunBearing } from './timeline.js'
import { rng, smooth } from './util.js'

const DOME_VERT = /* glsl */ `
  varying vec3 vDir;
  #include <fog_pars_vertex>
  void main() {
    vDir = (modelMatrix * vec4(position,1.0)).xyz-cameraPosition;
    vec4 mvPosition=modelViewMatrix * vec4(position,1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Infinite background: Water's oblique reflection clip plane must not cut
    // the dome into a visible circular island in the reflected sky.
    gl_Position.z=gl_Position.w;
    #include <fog_vertex>
  }`

const DOME_FRAG = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 glow;
  uniform vec3 sunDir;
  uniform float glowAmt;
  varying vec3 vDir;
  #include <fog_pars_fragment>
  void main() {
    vec3 direction=normalize(vDir);
    float h = clamp(direction.y, 0.0, 1.0);
    vec3 col = mix(horizon, top, pow(h, 0.42));
    float s = max(dot(direction, normalize(sunDir)), 0.0);
    col += glow * glowAmt * (pow(s, 6.0) * 0.45 + pow(s, 48.0) * 0.8);
    col = mix(col, horizon, 1.0 - smoothstep(-0.25, 0.0, direction.y));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Match the water's fully fogged horizon in the renderer's output space.
    // This also works on the direct phone renderer, whose fog is applied after
    // tone mapping rather than through the desktop output pass.
    #ifdef USE_FOG
      gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,1.0-smoothstep(-.02,.04,direction.y));
    #endif
  }`

// Direction of a body in the sky from its height (degrees) and its bearing (0 = straight ahead).
const dirFrom = (elev, bearing, out = new THREE.Vector3()) => {
  const e = (elev * Math.PI) / 180
  const b = (bearing * Math.PI) / 180
  return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e))
}

export function createSky(scene) {
  const group = new THREE.Group()
  scene.add(group)

  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    top: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    glow: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 0.1, -1) },
    glowAmt: { value: 1 },
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 14),
    new THREE.ShaderMaterial({ uniforms, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, fog:true }),
  )
  dome.frustumCulled = false
  dome.userData.noShadow = true
  dome.renderOrder = -10
  group.add(dome)

  const spriteMat = (map) => new THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })
  const sun = new THREE.Sprite(spriteMat(glowTexture()))
  sun.scale.setScalar(56)
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), depthWrite: false, transparent: true, fog: false }))
  moon.scale.setScalar(50)
  sun.renderOrder = moon.renderOrder = -9
  group.add(sun, moon)

  // Stars on the upper half of a sphere.
  const r = rng(77)
  const count = quality.low ? 500 : 1100
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const e = Math.asin(0.05 + r() * 0.95)
    pos.set([Math.cos(a) * Math.cos(e) * 850, Math.sin(e) * 850, Math.sin(a) * Math.cos(e) * 850], i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }))
  stars.frustumCulled = false
  stars.renderOrder = -9
  group.add(stars)

  // Sparse, uneven coastal banks leave clear sky around the architecture.
  // Original density/light integrals are baked once, with no runtime march.
  const clouds = []
  const cloudCount = quality.clouds
  for (let i = 0; i < cloudCount; i++) {
    const variant=i%5===4?2:i%3===2?1:0
    const mat = new THREE.SpriteMaterial({ map: cloudTexture(variant), depthWrite: false, transparent: true, fog: false, opacity: 0.6 })
    const s = new THREE.Sprite(mat)
    const k = 0.7 + r() * 0.9
    const size=variant===2?[120,70]:variant===1?[370,82]:[440,112]
    s.scale.set(size[0]*k,size[1]*k,1)
    const a=i/cloudCount*Math.PI*2+(r()-.5)*.58
    const dist = 620 + r() * 260
    s.userData = { a, dist, y:variant===2?210+r()*60:95+r()*90, speed: .0008+r()*.0012, k, variant }
    s.renderOrder = -8
    clouds.push(s)
    group.add(s)
  }

  // A few birds gliding across the sky.
  const birdGeo = new THREE.BufferGeometry()
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0.35, 0, 0, 0, 0, 0, 0, 0, 1, 0.35, 0], 3))
  const birdMat = new THREE.LineBasicMaterial({ color: 0x2a2030, transparent: true, opacity: 0.7, fog: false })
  const birds = []
  for (let i = 0; i < (quality.low ? 4 : 9); i++) {
    const b = new THREE.LineSegments(birdGeo.clone(), birdMat)
    b.userData = { phase: r() * 6, x: (r() - 0.5) * 120, y: 70 + r() * 40, z: -260 - r() * 80, s: 1.4 + r() * 1.2 }
    b.frustumCulled = false
    birds.push(b)
    group.add(b)
  }

  const sunDir = new THREE.Vector3()
  const moonDir = dirFrom(46, -20)
  const lightDir = new THREE.Vector3()
  const tint = new THREE.Color()
  const haze = new THREE.Color()

  return {
    group,
    dome,
    sunDir,
    lightDir,
    // p: values from timeline.sample(); cam: camera position; time: seconds; u: place on the route
    update(p, cam, time, u = 0) {
      group.position.copy(cam)
      uniforms.top.value.setRGB(...p.top)
      uniforms.horizon.value.setRGB(...p.horizon)
      uniforms.glow.value.setRGB(...p.glow)
      uniforms.glowAmt.value = p.glowAmt
      // The sun rises ahead on the right and sets ahead on the left, as the day goes on.
      dirFrom(p.elev, sunBearing(u), sunDir)
      uniforms.sunDir.value.copy(sunDir)
      sun.position.copy(sunDir).multiplyScalar(820)
      sun.material.opacity = smooth(-8, 3, p.elev) * (1 - p.night * 0.6)
      sun.material.color.setRGB(...p.light)
      moon.position.copy(moonDir).multiplyScalar(780)
      const nightLevel = smooth(0.45, 0.95, p.night)
      moon.material.opacity = nightLevel
      stars.material.opacity = smooth(0.5, 1, p.night) * 0.95
      // Light comes from the sun, then hands over to the moon.
      lightDir.copy(sunDir).lerp(moonDir, smooth(0.55, 0.9, p.night)).normalize()
      // clouds take the sky's glow: gold at dawn, rose at sunset, silver-blue at night
      tint.setRGB(1, 1, 1).lerp(new THREE.Color().setRGB(...p.glow), Math.min(0.75, 0.25 + p.glowAmt * 0.45)).multiplyScalar(0.35 + 0.75 * (1 - p.night * 0.8))
      haze.setRGB(...p.horizon)
      for (const c of clouds) {
        const d = c.userData
        const a = d.a + time * d.speed
        c.position.set(Math.cos(a) * d.dist, d.y, Math.sin(a) * d.dist)
        // clouds facing the sun glow brighter
        const facing = Math.max(0, (Math.cos(a) * sunDir.x + Math.sin(a) * sunDir.z) / Math.hypot(sunDir.x, sunDir.z || 1e-3))
        c.material.color.copy(tint).multiplyScalar(0.85 + facing * 0.35).lerp(haze,.24)
        c.material.opacity = (d.variant===2?.48:.56) * (1 - p.night * 0.7)
      }
      for (const b of birds) {
        const d = b.userData
        const x = ((((d.x + time * 6) % 300) + 450) % 300) - 150
        b.position.set(x, d.y + Math.sin(time * 0.6 + d.phase) * 3, d.z)
        const flap = Math.sin(time * 7 + d.phase) * 0.6
        const pos = b.geometry.attributes.position
        pos.setY(0, flap)
        pos.setY(3, flap)
        pos.needsUpdate = true
        b.scale.setScalar(d.s)
        b.visible = p.night < 0.6
      }
    },
  }
}
