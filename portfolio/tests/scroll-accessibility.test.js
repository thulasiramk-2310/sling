import { afterEach, expect, it, vi } from 'vitest'
import { buildStopLayout, journeyRunwayHeight } from '../src/mapping.js'
import { STORY_STOPS } from '../src/scene/story.js'

vi.mock('gsap',()=>({default:{registerPlugin(){}}}))
vi.mock('gsap/ScrollTrigger',()=>({ScrollTrigger:{refresh(){},update(){}}}))
vi.mock('lenis',()=>({default:class {
  constructor(options){this.options=options;this.scroll=0;this.isStopped=false;this.calls=[]}
  on(){} resize(){} stop(){this.isStopped=true} start(){this.isStopped=false}
  scrollTo(y,options){this.calls.push({y,options});this.scroll=y}
}}))
afterEach(()=>vi.unstubAllGlobals())

function sectionsAt(viewport) {
  let top=0
  return [4.5,1.8,1.8,1.8,1.8,1.55].map(scale=>{
    const section={offsetTop:top,offsetHeight:scale*viewport}
    top+=section.offsetHeight;return section
  })
}
for(const viewport of [900,844])it(`keeps the final reading stop longer than a viewport and leaves an ascent at ${viewport}px`,()=>{
  const sections=sectionsAt(viewport),last=sections.at(-1),baseMax=last.offsetTop+last.offsetHeight-viewport
  const old=buildStopLayout(sections,STORY_STOPS,baseMax,viewport)
  expect(old.bands.at(-1).end-old.bands.at(-1).start).toBeLessThan(viewport*.5)
  const max=baseMax+journeyRunwayHeight(sections,baseMax,viewport)
  const {anchors,bands}=buildStopLayout(sections,STORY_STOPS,max,viewport)
  expect(bands).toHaveLength(6)
  expect(bands.at(-1).end-bands.at(-1).start).toBeGreaterThanOrEqual(viewport)
  expect(max-bands.at(-1).end).toBeGreaterThanOrEqual(viewport*.25)
  expect(anchors.at(-1)).toEqual([max,1])
})

it('bounds only oversized reduced-motion world wheels immediately, preserving zoom, ordinary input and nested reading',async()=>{
  let world=true,runwayHeight=0,layoutReady=false
  const preference={matches:true,addEventListener(){}}
  const runway={style:{setProperty(_key,value){runwayHeight=parseFloat(value)}},setAttribute(){},get offsetHeight(){return world?runwayHeight:0}}
  const sections=sectionsAt(900).map(section=>({...section,parentElement:{append(){}}}))
  const baseHeight=sections.at(-1).offsetTop+sections.at(-1).offsetHeight
  class Element {matches(){return true}}
  vi.stubGlobal('HTMLElement',Element)
  vi.stubGlobal('window',{innerHeight:900,matchMedia:()=>preference,addEventListener(){}})
  vi.stubGlobal('document',{body:{classList:{contains:()=>world}},createElement:()=>runway,getElementById:id=>sections[['chennai','mamallapuram','thanjavur','madurai','rameswaram','kanyakumari'].indexOf(id)],documentElement:{get scrollHeight(){return baseHeight+(layoutReady?runway.offsetHeight:0)}}})
  const {createScroll}=await import('../src/scroll.js')
  const scroll=createScroll();scroll.start()
  expect(scroll.lenis.options.smoothWheel).toBe(false)
  const finalBand=scroll.diagnostics().bands.at(-1)
  expect(finalBand.end-finalBand.start).toBeGreaterThanOrEqual(900)
  layoutReady=true
  const dispatch=(raw,overrides={})=>{
    const event={type:'wheel',preventDefault:vi.fn(),composedPath:()=>[],...overrides}
    const result=scroll.lenis.options.virtualScroll({deltaY:raw*.55,deltaX:0,event})
    return {event,result}
  }
  const ordinary=dispatch(100)
  expect(ordinary.event.preventDefault).not.toHaveBeenCalled()
  expect(scroll.lenis.calls).toHaveLength(0)
  const large=dispatch(765)
  expect(large.result).toBe(false)
  expect(large.event.preventDefault).toHaveBeenCalledOnce()
  expect(scroll.lenis.calls.at(-1)).toEqual({y:180,options:{immediate:true}})
  dispatch(-765)
  expect(scroll.lenis.calls.at(-1)).toEqual({y:0,options:{immediate:true}})
  const calls=scroll.lenis.calls.length
  dispatch(765,{ctrlKey:true});dispatch(765,{composedPath:()=>[new Element()]})
  scroll.stop();dispatch(765);scroll.start();world=false;dispatch(765)
  expect(scroll.lenis.calls).toHaveLength(calls)
  world=true;preference.matches=false;dispatch(765)
  expect(scroll.lenis.calls).toHaveLength(calls)
  scroll.measure();const first=scroll.diagnostics().bands
  scroll.measure();expect(scroll.diagnostics().bands).toEqual(first)
})
