import {it,expect,vi,afterEach} from 'vitest'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {loadModels} from '../src/scene/models.js'

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
const manifest=entries=>vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>entries})))
const figure=()=>{
  const group=new THREE.Group()
  group.add(new THREE.Mesh(new THREE.BoxGeometry(2,3,1).translate(1,3,2),new THREE.MeshStandardMaterial()))
  return group
}

it('loads an authored model without constructing its expensive procedural fallback',async()=>{
  manifest({poet:{file:'poet.glb',scale:1,preserveOrigin:true,useOriginalMaterial:true}})
  const model=figure(),before=new THREE.Box3().setFromObject(model),material=new THREE.MeshStandardMaterial()
  vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue({scene:model})
  const fallback=vi.fn(figure),group=new THREE.Group()
  await loadModels([{name:'poet',group,material,fallback}])
  expect(fallback).not.toHaveBeenCalled()
  expect(group.children).toEqual([model])
  expect(model.children[0].material).toBe(material)
  const after=new THREE.Box3().setFromObject(model)
  expect(after.min.toArray()).toEqual(before.min.toArray())
  expect(after.max.toArray()).toEqual(before.max.toArray())
})

it('builds a deferred fallback when the manifest is missing or unavailable',async()=>{
  for(const unavailable of [false,true,null]) {
    if(unavailable)vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Offline')))
    else manifest(unavailable===null?null:{})
    const group=new THREE.Group(),fallback=vi.fn(figure)
    await loadModels([{name:'poet',group,fallback}])
    expect(fallback).toHaveBeenCalledOnce()
    expect(group.children).toHaveLength(1)
  }
})

it('keeps the world runnable when an individual model fails to load',async()=>{
  manifest({poet:{file:'missing.glb'}})
  vi.spyOn(GLTFLoader.prototype,'loadAsync').mockRejectedValue(new Error('404'))
  vi.spyOn(console,'warn').mockImplementation(()=>{})
  const group=new THREE.Group(),fallback=vi.fn(figure)
  await loadModels([{name:'poet',group,fallback}])
  expect(fallback).toHaveBeenCalledOnce()
  expect(group.children).toHaveLength(1)
})

it('retains centering and scale fitting for existing landmark entries',async()=>{
  manifest({landmark:{file:'landmark.glb'}})
  const model=figure(),group=new THREE.Group()
  vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue({scene:model})
  await loadModels([{name:'landmark',group,height:12}])
  const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3())
  expect(bounds.min.y).toBeCloseTo(0)
  expect(bounds.max.y).toBeCloseTo(12)
  expect(center.x).toBeCloseTo(0);expect(center.z).toBeCloseTo(0)
})
