import {it,expect} from 'vitest'
import {createStopController} from '../src/stop-controller.js'
import {STORY_STOPS} from '../src/scene/story.js'
import {advanceDrive} from '../src/scene/drive.js'

it('acknowledges every destination again while travelling back from the ending',()=>{
  const stops=createStopController()
  stops.visit(5,0);stops.arrive(STORY_STOPS[5]);stops.release()
  let state={u:1,velocity:0}
  for(let index=5;index>=0;index--){
    for(let i=0;i<6000 && stops.state().held===null;i++){
      state=advanceDrive(state,stops.target(0,state.u),1/60)
      stops.arrive(state.u)
    }
    expect(stops.state().held).toBe(index)
    expect(stops.state().direction).toBe(-1)
    expect(stops.target(0,state.u)).toBe(STORY_STOPS[index])
    state={u:STORY_STOPS[index],velocity:0};stops.release(-1)
  }
  expect(stops.target(0,STORY_STOPS[0])).toBe(0)
})

it('rearms the correct arrival after a direction reversal between destinations',()=>{
  const stops=createStopController()
  stops.visit(3,.8);stops.arrive(STORY_STOPS[3]);stops.release(-1)
  expect(stops.target(0,.70)).toBe(STORY_STOPS[2])
  expect(stops.target(1,.68)).toBe(STORY_STOPS[3])
  expect(stops.target(0,.70)).toBe(STORY_STOPS[2])
})

it('keeps an explicitly chosen chapter rather than intercepting intermediate stops',()=>{
  const stops=createStopController()
  stops.visit(4,.2)
  expect(stops.target(.9,.3)).toBe(STORY_STOPS[4])
  expect(stops.state().next).toBe(4)
  stops.arrive(STORY_STOPS[4]);stops.release(-1)
  stops.visit(0,.8)
  expect(stops.target(0,.7)).toBe(STORY_STOPS[0])
  expect(stops.state().direction).toBe(-1)
})
