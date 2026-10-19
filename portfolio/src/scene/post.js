// Post-processing for the cinematic look (desktop only):
// soft bloom on bright things, a colour grade that ties every scene to one warm palette,
// a gentle vignette and film grain, then tone mapping.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 0.93 },
    contrast: { value: 1.08 },
    tint: { value: new THREE.Color(1, 1, 1) },
    shadowTint: { value: new THREE.Color(0, 0, 0) },
    vignette: { value: 0.55 },
    grain: { value: 0.025 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform vec3 tint;
    uniform vec3 shadowTint;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // softer colours
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      // warm highlights, coloured shadows (the time of day's mood)
      col = col * tint + shadowTint * (1.0 - smoothstep(0.0, 0.35, l)) * 0.06;
      // contrast around mid grey (works on bright HDR values too)
      col = pow(max(col, 0.0) / 0.18, vec3(contrast)) * 0.18;
      // vignette
      float d = distance(vUv, vec2(0.5));
      col *= mix(1.0, smoothstep(0.95, 0.3, d), vignette);
      // film grain
      col += (hash(vUv * 1000.0 + time) - 0.5) * grain * (0.3 + l);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
}

// hide: objects (sky, sea) left out while ambient occlusion is measured, so towers don't cast dark halos on the sky.
export function createPost(renderer, scene, camera, { hide = [] } = {}) {
  const size = renderer.getSize(new THREE.Vector2())
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  // Ambient occlusion: soft contact shadows in corners, under ledges and between carvings.
  const ao = new GTAOPass(scene, camera, size.x / 2, size.y / 2)
  // compute the occlusion at half resolution; it is soft anyway, and this keeps it cheap
  const aoSetSize = ao.setSize.bind(ao)
  ao.setSize = (w, h) => aoSetSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)))
  ao.output = GTAOPass.OUTPUT.Default
  ao.blendIntensity = 0.85
  ao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 2.5, scale: 1, samples: 12, distanceFallOff: 1 })
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 })
  // Glows, beams, halos and leaf cards are see-through; ambient occlusion would treat them as solid squares.
  const seeThrough = [...hide]
  scene.traverse((o) => {
    const m = o.material
    if (o.isSprite || o.isPoints || o.isLine || (o.isMesh && m && (m.transparent || m.alphaTest > 0))) seeThrough.push(o)
  })
  const aoRender = ao.render.bind(ao)
  ao.render = (...args) => {
    const was = seeThrough.map((o) => o.visible)
    seeThrough.forEach((o) => (o.visible = false))
    try {
      aoRender(...args)
    } finally {
      seeThrough.forEach((o, i) => (o.visible = was[i]))
    }
  }
  composer.addPass(ao)
  // threshold above 1, so only real light sources (sun, lamps, lit windows) glow, not the whole sky
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.6, 1.05)
  composer.addPass(bloom)
  const grade = new ShaderPass(GradeShader)
  composer.addPass(grade)
  composer.addPass(new OutputPass())
  const u = grade.uniforms
  return {
    render: () => composer.render(),
    // the first thing to give up on a slow machine
    aoOn: () => ao.enabled,
    setAO: (on) => (ao.enabled = on),
    setSize: (w, h) => {
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(w, h)
    },
    // p: time-of-day values from timeline.sample()
    update(p, time) {
      u.time.value = time % 100
      // highlights lean toward the horizon colour (gold at dawn, rose at dusk, blue at night)
      u.tint.value.setRGB(1, 1, 1).lerp(new THREE.Color().setRGB(...p.horizon), 0.16 + p.glowAmt * 0.08)
      u.shadowTint.value.setRGB(...p.top)
      bloom.strength = 0.35 + p.night * 0.55 + p.glowAmt * 0.1
    },
  }
}
