// Optional real 3D models. Drop a .glb into public/models/ and list it in public/models/models.json;
// it then replaces the hand-built version of that landmark (or the auto). Nothing is loaded otherwise.
//
// models.json example:
// {
//   "thanjavur": { "file": "periya-kovil.glb", "rotateY": 90, "credit": "Periya Kovil by Jane Doe, CC BY 4.0 (sketchfab.com/...)" },
//   "auto": { "file": "auto-rickshaw.glb", "rotateY": 180 }
// }
// Slots: chennai-lighthouse, chennai-central, shore-temple, mamallapuram-elephant, thanjavur, madurai, auto.
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
  // Original generated models already use their assembly's authored origin.
  if(entry.preserveOrigin)return
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
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
      const data=await res.json()
      if(data && typeof data==='object' && !Array.isArray(data))manifest=data
    }
  } catch {
    // Deferred procedural fallbacks still need to be built if the manifest is
    // unavailable. Existing landmarks already contain their own fallback mesh.
  }
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const credits = []
  for (const slot of slots) {
    const entry = manifest[slot.name]
    const fallback=()=>{if(slot.fallback && slot.group.children.length===0)slot.group.add(slot.fallback())}
    if (!entry?.file) {fallback();continue}
    try {
      const file = quality.low && entry.lowFile ? entry.lowFile : entry.file
      const gltf = await loader.loadAsync(base + file)
      const model = gltf.scene
      model.userData.preserveAssembly = true
      fit(model, slot, entry)
      let originalMaterial=slot.material
      if(entry.useOriginalMaterial && !originalMaterial)slot.group.traverse(object=>{if(!originalMaterial && object.isMesh)originalMaterial=object.material})
      model.traverse((o) => {
        if (!o.isMesh) return
        if(entry.useOriginalMaterial && originalMaterial)o.material=originalMaterial
        o.castShadow = o.receiveShadow = !quality.low
      })
      // hide the hand-built version, keep its place in the world
      slot.group.children.forEach((c) => (c.visible = false))
      slot.group.add(model)
      if (entry.credit) credits.push(entry.credit)
    } catch (err) {
      console.warn(`Model for "${slot.name}" could not be loaded:`, err)
      fallback()
    }
  }
  return credits
}
