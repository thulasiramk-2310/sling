import { expect,it } from 'vitest'
import * as THREE from 'three'
import { createRamAvatar } from '../src/scene/avatar.js'
import { CHARACTER_SECTIONS,loftGeometry } from '../src/scene/character-geometry.js'

it('character profiles are continuous, finite and carry usable UVs and normals',()=>{
  for(const sections of Object.values(CHARACTER_SECTIONS)) {
    const geometry=loftGeometry(sections)
    for(const value of geometry.attributes.position.array)expect(Number.isFinite(value)).toBe(true)
    for(const value of geometry.attributes.normal.array)expect(Number.isFinite(value)).toBe(true)
    expect(geometry.attributes.uv.count).toBe(geometry.attributes.position.count)
    expect(geometry.boundingSphere.radius).toBeGreaterThan(0)
  }
})
it('standing character remains grounded and the seated driver fits the canopy',()=>{
  for(const seated of [false,true]) {
    const avatar=createRamAvatar({seated})
    for(const pose of [0,.3,.7,1]) {
      avatar.update(3,pose,true);avatar.root.updateMatrixWorld(true)
      const bounds=new THREE.Box3().setFromObject(avatar.root)
      if(pose===0 && !seated){expect(bounds.min.y).toBeGreaterThan(-.02);expect(bounds.max.y).toBeGreaterThan(1.7)}
      if(seated){expect(bounds.max.y).toBeLessThan(1.91);expect(bounds.min.y).toBeGreaterThan(.4);expect(bounds.max.z).toBeLessThan(.95)}
    }
    let meshes=0;avatar.root.traverse(object=>{if(object.isMesh)meshes++})
    expect(meshes).toBeLessThan(65)
  }
})
