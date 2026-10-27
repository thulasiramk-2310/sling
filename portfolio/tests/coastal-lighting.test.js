import {it,expect} from 'vitest'
import * as THREE from 'three'
import {sample,sunBearing} from '../src/scene/timeline.js'
import {createRoute} from '../src/scene/route.js'

it('gives the actual final monument a raking front key rather than backlighting it',()=>{
  const front=createRoute().at(.96).right.clone().negate()
  const elevation=THREE.MathUtils.degToRad(sample(.96).elev),bearing=THREE.MathUtils.degToRad(sunBearing(.96))
  const light=new THREE.Vector3(Math.sin(bearing)*Math.cos(elevation),Math.sin(elevation),-Math.cos(bearing)*Math.cos(elevation))
  expect(front.dot(light)).toBeGreaterThan(.5)
  expect(front.dot(light)).toBeLessThan(.8)
})

it('keeps the earlier day and Pamban night outside the new dawn treatment',()=>{
  for(const u of [0,.34,.64,.85,.89]) {
    expect(sample(u).finalDawn).toBe(0)
    expect(sunBearing(u)).toBeCloseTo(-25+60*Math.min(1,u/.7),8)
  }
  expect(sample(.85).night).toBe(1)
  expect(sample(.96).finalDawn).toBe(1)
  expect(sample(.96).horizon[2]).toBeGreaterThan(sample(.96).horizon[0])
})
