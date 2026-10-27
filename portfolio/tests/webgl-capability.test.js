import {it,expect,vi,afterEach} from 'vitest'
import {hasWebGL,shouldOfferReadable} from '../src/scene/quality.js'
afterEach(()=>vi.unstubAllGlobals())
it('accepts only the context supported by the installed renderer and handles blocked contexts',()=>{
  vi.stubGlobal('window',{WebGLRenderingContext:class{}})
  vi.stubGlobal('document',{createElement:()=>({getContext:type=>type==='webgl'?{}:null})})
  expect(hasWebGL()).toBe(false)
  window.WebGL2RenderingContext=class{}
  vi.stubGlobal('document',{createElement:()=>({getContext:type=>type==='webgl2'?{}:null})})
  expect(hasWebGL()).toBe(true)
  vi.stubGlobal('document',{createElement(){throw new Error('Context blocked')}})
  expect(hasWebGL()).toBe(false)
})

it('offers a reading path only for measured slow rendering after all available reductions',()=>{
  const exhausted={fps:8,dpr:.75,ao:false,reflections:false,bloom:false,shadows:false}
  expect(shouldOfferReadable(exhausted,true)).toBe(true)
  for(const changes of [{fps:null},{fps:0},{fps:45},{dpr:1},{ao:true},{reflections:true},{bloom:true},{shadows:true}])
    expect(shouldOfferReadable({...exhausted,...changes},true)).toBe(false)
  expect(shouldOfferReadable(exhausted,false)).toBe(false)
  expect(shouldOfferReadable(null,true)).toBe(false)
})
