import {it,expect} from 'vitest'
import {sample} from '../src/scene/timeline.js'
import baseline from './fixtures/later-lighting-baseline.json'

it('preserves verified inland, sunset, night and final-dawn lighting exactly',()=>{
  for(const {u,state}of baseline)expect(sample(u)).toEqual({...state,opening:0})
})
it('keeps parked Chennai lighting coherent and blends out before inland daylight',()=>{
  const parked=sample(.07)
  expect(parked.opening).toBe(1);expect(parked.hemiI).toBe(.76)
  expect(parked.elev).toBe(13.5);expect(parked.lightI).toBe(1.75)
  let previous=1
  for(let i=0;i<=1000;i++){
    const p=sample(.10+i/1000*.14)
    expect(p.opening).toBeLessThanOrEqual(previous);previous=p.opening
    expect(Object.values(p).flat().filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true)
  }
  expect(sample(.24).opening).toBe(0)
})
