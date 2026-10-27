import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { poetStatue } from '../src/scene/landmarks/poet-statue.js'
import { poetLimbsGeometry } from '../src/scene/landmarks/poet-limbs.js'
import { poetBodyGeometry } from '../src/scene/landmarks/poet-body.js'

describe('poet statue geometry', () => {
  it('closes drape seams and cloth ribbon edges on both LODs',()=>{
    for(const low of [false,true]) {
      const p=poetBodyGeometry(low).attributes.position,edges=new Map()
      const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',')
      for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++) {
        const a=key(i+j),b=key(i+(j+1)%3),edge=a<b?a+'|'+b:b+'|'+a
        edges.set(edge,(edges.get(edge)||0)+1)
      }
      expect([...edges.values()].every(count=>count===2)).toBe(true)
    }
  })
  it('keeps continuous gaps between the three raised fingers on both quality levels',()=>{
    for(const low of [false,true]) {
      // Keep every triangle whose bounds can intersect the scanned rays. This
      // exact broad-phase crop avoids testing distant arms thousands of times.
      const source=poetLimbsGeometry(low).attributes.position,positions=[]
      for(let i=0;i<source.count;i+=3) {
        const xs=[0,1,2].map(j=>source.getX(i+j)),ys=[0,1,2].map(j=>source.getY(i+j)),zs=[0,1,2].map(j=>source.getZ(i+j))
        if(Math.max(...xs)<-3.6 || Math.min(...xs)>-2.25 || Math.max(...ys)<20.3 || Math.min(...ys)>21.1 || Math.max(...zs)<1.7)continue
        for(let j=0;j<3;j++)positions.push(xs[j],ys[j],zs[j])
      }
      const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
      const material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(geometry,material)
      mesh.updateMatrixWorld(true)
      const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1),0,3.3)
      for(let row=0;row<=32;row++) {
        let bands=0,previous=false,lastEnd=null,minGap=Infinity
        for(let i=0;i<=200;i++) {
          const x=-3.6+i/200*1.35
          ray.ray.origin.set(x,20.3+row*.025,5)
          const hit=ray.intersectObject(mesh).length>0
          if(hit && !previous) {
            bands++
            if(lastEnd!==null)minGap=Math.min(minGap,x-lastEnd)
          }
          if(!hit && previous)lastEnd=x
          previous=hit
        }
        expect(bands).toBe(3)
        expect(minGap).toBeGreaterThan(.07)
      }
      geometry.dispose();material.dispose()
    }
  })
  it('keeps a finite, bounded sculpture in one draw mesh', () => {
    const counts=[]
    for(const low of [false,true]) {
    const material=new THREE.MeshStandardMaterial()
    const figure=poetStatue(material,low)
    const mesh=figure.children[0]
    expect(figure.children).toHaveLength(1)
    const triangles=mesh.geometry.attributes.position.count/3
    counts.push(triangles)
    expect(triangles).toBeLessThan(low?80000:130000)
    for(const name of ['position','normal']) {
      expect(mesh.geometry.attributes[name].array.every(Number.isFinite)).toBe(true)
    }
    const box=new THREE.Box3().setFromObject(figure),size=box.getSize(new THREE.Vector3())
    expect(size.y).toBeGreaterThan(28)
    expect(size.y).toBeLessThan(29)
    expect(size.x).toBeGreaterThan(7)
    expect(size.x).toBeLessThan(9)
    mesh.geometry.dispose();mesh.material.dispose();material.dispose()
    }
    expect(counts[1]).toBeLessThan(counts[0]*.75)
  })
  it('keeps drapery and curled fingers free of inverted or collapsed faces', () => {
    for(const low of [false,true]) {
    const material=new THREE.MeshStandardMaterial()
    const mesh=poetStatue(material,low).children[0],geometry=mesh.geometry
    const p=geometry.attributes.position,n=geometry.attributes.normal
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
    const face=new THREE.Vector3(),normal=new THREE.Vector3(),corner=new THREE.Vector3()
    let inverted=0,collapsed=0
    for(let i=0;i<p.count;i+=3) {
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2)
      face.copy(b).sub(a).cross(c.sub(a))
      if(face.lengthSq()<1e-16)collapsed++
      normal.fromBufferAttribute(n,i)
        .add(corner.fromBufferAttribute(n,i+1)).add(corner.fromBufferAttribute(n,i+2))
      if(face.dot(normal)<-1e-10)inverted++
    }
    expect(inverted).toBe(0)
    expect(collapsed).toBe(0)
    geometry.dispose();mesh.material.dispose();material.dispose()
    }
  })

})
