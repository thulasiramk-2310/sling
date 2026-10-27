import {it,expect} from 'vitest'
import * as THREE from 'three'
import {poetPedestal} from '../src/scene/landmarks/poet-pedestal.js'

it('builds a finite solid pedestal at the figure support height in two draws',()=>{
  for(const low of [false,true]) {
    const stone=new THREE.MeshStandardMaterial(),dark=new THREE.MeshBasicMaterial()
    const pedestal=poetPedestal(stone,dark,low)
    expect(pedestal.children).toHaveLength(2)
    let triangles=0
    pedestal.traverse(object=>{
      if(!object.geometry)return
      for(const name of ['position','normal'])expect(object.geometry.attributes[name].array.every(Number.isFinite)).toBe(true)
      triangles+=object.geometry.attributes.position.count/3
    })
    expect(triangles).toBeLessThan(8000)
    const bounds=new THREE.Box3().setFromObject(pedestal)
    expect(bounds.max.y).toBeCloseTo(12,1)
    expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(16.2)
    pedestal.updateMatrixWorld(true)
    const ray=new THREE.Raycaster(new THREE.Vector3(0,20,0),new THREE.Vector3(0,-1,0))
    expect(ray.intersectObjects(pedestal.children)[0].point.y).toBeCloseTo(12,1)
    pedestal.traverse(object=>object.geometry?.dispose());stone.dispose();dark.dispose()
  }
})

it('recesses the doorway and windows behind the continuous stone facade',()=>{
  const stone=new THREE.MeshStandardMaterial(),dark=new THREE.MeshBasicMaterial()
  const pedestal=poetPedestal(stone,dark);pedestal.updateMatrixWorld(true)
  const front=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,20),new THREE.Vector3(0,0,-1)).intersectObjects(pedestal.children)[0]
  const wall=front(-3,5.8)
  for(const hit of [front(0,3),front(-4.3,5.8),front(4.3,5.8)]) {
    expect(hit.object.material).toBe(dark)
    expect(wall.point.z-hit.point.z).toBeGreaterThan(.5)
  }
  expect(wall.object.material).toBe(stone)
  pedestal.traverse(object=>object.geometry?.dispose());stone.dispose();dark.dispose()
})
