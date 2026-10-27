import * as THREE from 'three'
import { createAuto } from './auto.js'

// A small, disposable studio view of the actual vehicle used in the world.
// It renders only when progress changes, with no second animation loop.
export function createLoadingAuto(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.setSize(340, 230, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 340 / 230, .1, 30)
  camera.position.set(4.8, 2.9, 5.8)
  camera.lookAt(0, .95, 0)
  scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x766351, 3))
  const key = new THREE.DirectionalLight(0xffe5c0, 3)
  key.position.set(-3, 6, 4)
  scene.add(key)
  const auto = createAuto()
  scene.add(auto.root)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), new THREE.MeshBasicMaterial({ color: 0x786e5b, transparent: true, opacity: .08, depthWrite: false }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -.015
  floor.scale.set(1, .55, 1)
  scene.add(floor)
  renderer.render(scene, camera)
  return {
    draw(progress) {
      auto.update(.035, .35, 1, 0, progress * 3, 0)
      renderer.render(scene, camera)
    },
    dispose() {
      // Model materials/textures may be shared with the world; release only
      // this renderer's context, never dispose those shared source resources.
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
