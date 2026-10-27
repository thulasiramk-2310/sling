import {it,expect,vi,afterEach} from 'vitest'
import * as THREE from 'three'
import {quality} from '../src/scene/quality.js'
import {createAuto} from '../src/scene/auto.js'

vi.mock('../src/scene/textures.js',()=>({glowTexture:()=>null,grainTexture:()=>null,withRelief:()=>({})}))
const original={...quality}
afterEach(()=>{Object.assign(quality,original);vi.unstubAllGlobals()})
it('batches fixed vehicle panels while retaining real steering, wheel spin and driver visibility',()=>{
  Object.assign(quality,{low:true,exhaust:false})
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})})
  const auto=createAuto()
  const wheels=[];auto.root.traverse(node=>{if(node.name==='Rickshaw rolling wheel')wheels.push(node)})
  expect(wheels).toHaveLength(3)
  expect(auto.driver.parent).toBe(auto.body)
  expect(auto.body.children.filter(node=>node.isMesh).length).toBeLessThan(25)
  auto.root.updateMatrixWorld(true)
  const before=new THREE.Box3().setFromObject(auto.root)
  auto.update(.05,.5,1,.02,1,0)
  expect(wheels.every(wheel=>wheel.rotation.x>0)).toBe(true)
  expect(auto.root.getObjectByName('Front steering fork').rotation.y).toBeGreaterThan(0)
  auto.driver.visible=false;expect(auto.driver.parent).toBe(auto.body)
  expect(before.max.y).toBeLessThan(2)
})
