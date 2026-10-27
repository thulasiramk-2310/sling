import {it,expect} from 'vitest'
import {createFrameBudget} from '../src/scene/frame-budget.js'

it('counts a visible multi-second frame instead of retaining a stale healthy rate',()=>{
  const meter=createFrameBudget(0)
  expect(meter.sample(8.8997,8899.7)).toBeCloseTo(1/8.8997,8)
})

it('measures steady cadence across independent sampling windows',()=>{
  const meter=createFrameBudget(0),rates=[]
  for(let frame=1;frame<=360;frame++) {
    const fps=meter.sample(1/60,frame*1000/60)
    if(fps!==null)rates.push(fps)
  }
  expect(rates).toHaveLength(2)
  for(const fps of rates)expect(fps).toBeCloseTo(60,8)
})

it('excludes hidden-tab time and the first interval after visibility resumes',()=>{
  const meter=createFrameBudget(0)
  meter.sample(1/60,16.67)
  meter.reset(1000)
  expect(meter.sample(25,26000)).toBeNull()
  const rates=[]
  for(let frame=1;frame<=160;frame++) {
    const fps=meter.sample(1/60,26000+frame*1000/60)
    if(fps!==null)rates.push(fps)
  }
  expect(rates[0]).toBeCloseTo(60,8)
  expect(meter.sample(20,50000,false)).toBeNull()
})

it('ignores forced still renders and invalid timing samples',()=>{
  const meter=createFrameBudget(0)
  for(const delta of [0,-1,NaN,Infinity])expect(meter.sample(delta,3000)).toBeNull()
  expect(meter.sample(3,6000)).toBeCloseTo(1/3,8)
})
