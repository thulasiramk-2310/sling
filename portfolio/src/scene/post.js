// Post-processing for the cinematic look (desktop only):
// soft bloom on bright things, a colour grade that ties every scene to one warm palette,
// a gentle vignette and film grain, then tone mapping.
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
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

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2())
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  // threshold above 1, so only real light sources (sun, lamps, lit windows) glow, not the whole sky
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.6, 1.05)
  composer.addPass(bloom)
  const grade = new ShaderPass(GradeShader)
  composer.addPass(grade)
  composer.addPass(new OutputPass())
  const u = grade.uniforms
  return {
    render: () => composer.render(),
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
