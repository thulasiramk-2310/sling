import { describe,expect,it } from 'vitest'
import { buildStopLayout,mapScroll } from '../src/mapping.js'
import { createStopController } from '../src/stop-controller.js'
import { STORY_STOPS } from '../src/scene/story.js'
import { advanceDrive,journeyPace } from '../src/scene/drive.js'
import { createSkillCollection,SKILL_MARKERS } from '../src/scene/interactions/skills.js'
import { createRoute } from '../src/scene/route.js'
import { PROJECTS } from '../src/content.js'

describe('stop acknowledgement',()=>{
  it('a request for the end parks at each stop until the reading band is released',()=>{
    const stops=createStopController()
    let state={u:0,velocity:0}
    for(let index=0;index<STORY_STOPS.length;index++) {
      for(let frame=0;frame<6000 && stops.state().held===null;frame++) {
        state=advanceDrive(state,stops.target(1),1/60)
        stops.arrive(state.u)
      }
      expect(stops.state().held).toBe(index)
      expect(stops.target(1)).toBe(STORY_STOPS[index])
      expect(stops.target(0)).toBe(STORY_STOPS[index])
      state={u:STORY_STOPS[index],velocity:0}
      expect(stops.release()).toBe(true)
    }
    expect(stops.target(1)).toBe(1)
  })
  it('explicit chapter selection allows revisits without releasing the selected stop',()=>{
    const stops=createStopController();stops.visit(3)
    expect(stops.target(1)).toBe(STORY_STOPS[3])
    expect(stops.arrive(STORY_STOPS[3])).toBe(3)
    stops.visit(1);expect(stops.target(1)).toBe(STORY_STOPS[1])
  })
})

it('collects actual skill crossings once, preserves reverse travel, and skips debug seeks',()=>{
  const collection=createSkillCollection()
  collection.update(.086);expect(collection.update(.09)).toEqual(['Python'])
  collection.update(.08);expect(collection.update(.09)).toEqual(['Python'])
  collection.seek(.27);expect(collection.update(.271)).toEqual(['Python'])
  collection.seek(.07)
  const all=collection.update(.27)
  expect(all).toEqual(SKILL_MARKERS.map(marker=>marker.name))
})

it('route has substantial bends in both directions while the bridge stays straight',()=>{
  const route=createRoute();let east=0,west=0
  for(let i=1;i<650;i++){const tangent=route.at(i/1000).tan;east=Math.max(east,tangent.x);west=Math.min(west,tangent.x)}
  expect(east).toBeGreaterThan(.5);expect(west).toBeLessThan(-.5)
  expect(Math.abs(route.at(.79).tan.x)).toBeLessThan(.02)
})

it('features ArkaOS, includes the verified replacements, and removes RECALL X',()=>{
  expect(PROJECTS[0].name).toBe('ArkaOS');expect(PROJECTS[0].featured).toBe(true)
  expect(PROJECTS[0].website).toBe('https://thulasiramk-2310.github.io/Arka/')
  expect(PROJECTS.some(project=>project.name==='RECALL X')).toBe(false)
  expect(PROJECTS.filter(project=>['kural-kv','SysOracle'].includes(project.name))).toHaveLength(2)
})

it('the normal skill drive gives labels time instead of completing in a few seconds',()=>{
  let state={u:.32,velocity:0},seconds=0
  while(state.u<.49-.0004 && seconds<60){state=advanceDrive(state,.49,journeyPace(state.u)/60);seconds+=1/60}
  expect(seconds).toBeGreaterThan(20);expect(seconds).toBeLessThan(45)
})

it('each stop holds the camera over a real scroll interval and resumes beyond it',()=>{
  const sections=Array.from({length:6},(_,i)=>({offsetTop:i*2000,offsetHeight:2000}))
  const {anchors,bands}=buildStopLayout(sections,STORY_STOPS,11100,900)
  expect(bands).toHaveLength(6)
  for(const band of bands){
    expect(band.end-band.start).toBeGreaterThan(500)
    expect(mapScroll(band.start+1,anchors)).toBe(band.progress)
    expect(mapScroll(band.center,anchors)).toBe(band.progress)
    expect(mapScroll(band.end-1,anchors)).toBe(band.progress)
    expect(mapScroll(band.end+10,anchors)).toBeGreaterThan(band.progress)
  }
})
