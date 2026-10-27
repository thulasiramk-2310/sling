import {it,expect,vi,afterEach} from 'vitest'
import {hasWebGL} from '../src/scene/quality.js'
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
