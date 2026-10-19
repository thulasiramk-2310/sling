// Optional real 3D models. Drop a .glb into public/models/ and list it in public/models/models.json;
// it then replaces the hand-built version of that landmark (or the auto). Nothing is loaded otherwise.
//
// models.json example:
// {
//   "thanjavur": { "file": "periya-kovil.glb", "rotateY": 90, "credit": "Periya Kovil by Jane Doe, CC BY 4.0 (sketchfab.com/...)" },
//   "auto": { "file": "auto-rickshaw.glb", "rotateY": 180 }
// }
// Slots: chennai-lighthouse, chennai-central, shore-temple, thanjavur, madurai, auto.
// Compress models first (meshopt and WebP textures), for example:
//   npx gltfpack -i in.glb -o public/models/out.glb -cc
//   npx @gltf-transform/cli webp public/models/out.glb public/models/out.glb
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { quality } from './quality.js'

const base = import.meta.env.BASE_URL + 'models/'

// Scales a model to the slot's size, sits it on the ground, and centres it.
function fit(model, slot, entry) {
  model.rotation.y = ((entry.rotateY ?? 0) * Math.PI) / 180
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  let k = entry.scale ?? 1
  if (!entry.scale) {
    if (slot.height) k = slot.height / Math.max(size.y, 1e-6)
    else if (slot.length) k = slot.length / Math.max(size.z, size.x, 1e-6)
  }
  model.scale.multiplyScalar(k)
  model.updateMatrixWorld(true)
  box.setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.x -= center.x
  model.position.z -= center.z
  model.position.y -= box.min.y
  if (entry.offset) model.position.add(new THREE.Vector3(...entry.offset))
}

// slots: [{ name, group, height?, length? }]. Returns the credits of the models that loaded.
export async function loadModels(slots) {
  let manifest = {}
  try {
    const res = await fetch(base + 'models.json', { cache: 'no-cache' })
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) manifest = await res.json()
  } catch {
    return []
  }
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const credits = []
  for (const slot of slots) {
    const entry = manifest[slot.name]
    if (!entry?.file) continue
    try {
      const gltf = await loader.loadAsync(base + entry.file)
      const model = gltf.scene
      fit(model, slot, entry)
      model.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = o.receiveShadow = !quality.low
      })
      // hide the hand-built version, keep its place in the world
      slot.group.children.forEach((c) => (c.visible = false))
      slot.group.add(model)
      if (entry.credit) credits.push(entry.credit)
    } catch (err) {
      console.warn(`Model for "${slot.name}" could not be loaded:`, err)
    }
  }
  return credits
}
