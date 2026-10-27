import { mkdir,writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { createStoneElephant } from '../src/scene/landmarks/elephant.js'

// GLTFExporter's binary writer uses this browser API. Node supplies Blob but
// not FileReader; this adapter reads the same bytes without a browser process.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer)=>{ this.result=buffer;this.onloadend?.() })
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer)=>{ this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.() })
  }
}

const directory=new URL('../public/models/',import.meta.url)
await mkdir(directory,{recursive:true})
for(const low of [false,true]) {
  const model=createStoneElephant(new THREE.MeshStandardMaterial({color:0x9c9384,roughness:.96}),low)
  model.traverse((object)=>{ if(object.isMesh) object.geometry=mergeVertices(object.geometry) })
  const bytes=await new GLTFExporter().parseAsync(model,{binary:true})
  const output=new URL(low?'elephant-study-low.glb':'elephant-study.glb',directory)
  await writeFile(output,new Uint8Array(bytes))
  console.log(`${fileURLToPath(output)} (${bytes.byteLength} bytes)`)
}
