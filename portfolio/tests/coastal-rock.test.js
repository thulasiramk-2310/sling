import { it,expect } from 'vitest'
import * as THREE from 'three'
import { coastalRock } from '../src/scene/landmarks/coastal-rock.js'

it('keeps both islands bounded and finite with a smaller phone geometry budget',()=>{
  const totals=[]
  for(const low of [false,true]) {
    let triangles=0
    for(const options of [{rx:35,rz:32,kind:'memorial',seed:82},{rx:22,rz:19,seed:88}]) {
      const rock=coastalRock({...options,low})
      expect(rock.children).toHaveLength(3)
      rock.traverse(object=>{
        if(!object.geometry)return
        for(const attribute of Object.values(object.geometry.attributes))expect(attribute.array.every(Number.isFinite)).toBe(true)
        triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3
      })
      const bounds=new THREE.Box3().setFromObject(rock)
      expect(bounds.min.y).toBeCloseTo(-4.3,4)
      expect(bounds.max.y).toBeLessThan(7.1)
      expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(options.rx*2.7)
      rock.traverse(object=>{object.geometry?.dispose();object.material?.dispose()})
    }
    totals.push(triangles)
  }
  expect(totals[0]).toBeLessThan(19000)
  expect(totals[1]).toBeLessThan(totals[0]*.4)
})

it('supports the memorial foundations and keeps the statue podium above its rock',()=>{
  for(const low of [false,true])for(const [options,points] of [
    [{rx:35,rz:32,kind:'memorial',seed:82},[[0,-3,4.94],[-18,12,3.12]]],
    [{rx:22,rz:19,seed:88},[[0,0,-.04],[7,6,-.04],[-7,-6,-.04]]],
  ]) {
    const rock=coastalRock({...options,low});rock.updateMatrixWorld(true)
    for(const [x,z,support] of points) {
      const ray=new THREE.Raycaster(new THREE.Vector3(x,15,z),new THREE.Vector3(0,-1,0))
      const hits=ray.intersectObjects(rock.children.filter(mesh=>!mesh.material.transparent))
      expect(hits.length).toBeGreaterThan(0)
      expect(Math.abs(hits[0].point.y-support)).toBeLessThan(.16)
    }
    rock.traverse(object=>{object.geometry?.dispose();object.material?.dispose()})
  }
})
