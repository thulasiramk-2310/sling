import { expect,it } from 'vitest'
import * as THREE from 'three'
import { canopyRoofGeometry,rearCurtainGeometry } from '../src/scene/auto-panels.js'
import { streetGeometry } from '../src/scene/architecture.js'

it('the rear curtain has an actual window aperture with solid surround',()=>{
  const mesh=new THREE.Mesh(rearCurtainGeometry(),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
  mesh.updateMatrixWorld(true)
  const direction=new THREE.Vector3(0,0,1)
  expect(new THREE.Raycaster(new THREE.Vector3(0,1.48,-2),direction).intersectObject(mesh)).toHaveLength(0)
  expect(new THREE.Raycaster(new THREE.Vector3(.58,1.48,-2),direction).intersectObject(mesh).length).toBeGreaterThan(0)
})
it('canopy crown is continuous, finite and cheaper on phones',()=>{
  const high=canopyRoofGeometry(),low=canopyRoofGeometry(true)
  expect(low.attributes.position.count).toBeLessThan(high.attributes.position.count)
  for(const geometry of [high,low]) {
    for(const value of geometry.attributes.position.array)expect(Number.isFinite(value)).toBe(true)
    const bounds=geometry.boundingBox
    expect(bounds.max.y-bounds.min.y).toBeGreaterThan(.1)
    expect(bounds.max.x).toBeCloseTo(.7)
    expect(bounds.max.y).toBeLessThan(1.95)
  }
})
it('street variants have distinct silhouettes and retain bounded geometry',()=>{
  const variants=[streetGeometry(2),streetGeometry(1,1),streetGeometry(2,2)]
  const heights=variants.map(model=>{
    const box=new THREE.Box3()
    for(const geometry of Object.values(model.geometries)) {
      geometry.computeBoundingBox();box.union(geometry.boundingBox)
      expect(geometry.attributes.position.count).toBeLessThan(12000)
      for(const value of geometry.attributes.position.array)expect(Number.isFinite(value)).toBe(true)
    }
    return box.max.y
  })
  expect(heights[1]).toBeLessThan(heights[0]);expect(heights[2]).toBeGreaterThan(heights[0])
})
