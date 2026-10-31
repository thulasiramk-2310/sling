import * as THREE from 'three'
import { createAuto } from './auto.js'
import { quality } from './quality.js'

function studioEnvironment(renderer) {
  const room=new THREE.Scene();room.background=new THREE.Color(0x41494b)
  const geometry=new THREE.PlaneGeometry(1,1),materials=[]
  for(const [position,size,color] of [
    [[-3,4,2],[3.5,5],[3.2,2.85,2.4]],
    [[4,2,-2],[1.2,5],[1.7,2.1,2.4]],
    [[0,5,-3],[4,2],[1.35,1.5,1.65]],
  ]){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(...color)})
    const panel=new THREE.Mesh(geometry,material);panel.position.set(...position)
    panel.scale.set(size[0],size[1],1);panel.lookAt(0,1,0);room.add(panel);materials.push(material)
  }
  const generator=new THREE.PMREMGenerator(renderer)
  const target=generator.fromScene(room,.03,.1,20,{size:128})
  generator.dispose();geometry.dispose();materials.forEach(material=>material.dispose())
  return target
}

// A small, disposable studio view of the actual vehicle used in the world.
// It renders only when progress changes, with no second animation loop.
export function createLoadingAuto(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.setSize(340, 230, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  const scene = new THREE.Scene()
  // Original studio light cards give the clear coat and metal something to
  // reflect. Bake once; the loading view has no continuous environment pass.
  const environment=quality.low?null:studioEnvironment(renderer)
  if(environment){scene.environment=environment.texture;scene.environmentIntensity=.6}
  const camera = new THREE.PerspectiveCamera(32, 340 / 230, .1, 30)
  camera.position.set(4.8, 2.9, 5.8)
  camera.lookAt(0, .95, 0)
  scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x766351, quality.low?2.2:1.25))
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
      environment?.dispose()
      renderer.forceContextLoss()
    },
  }
}
