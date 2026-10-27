import {it,expect} from 'vitest'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {PROJECTS} from '../src/content.js'
import * as THREE from 'three'
import {roundedNoseGeometry,frontFasciaGeometry,canopyValanceGeometry} from '../src/scene/auto-panels.js'

it('ships the configured real project screenshots with intact source records',async()=>{
  const records=JSON.parse(await readFile(new URL('../public/projects/sources.json',import.meta.url)))
  const ids=PROJECTS.map(project=>project.id)
  expect(new Set(ids).size).toBe(PROJECTS.length)
  for(const project of PROJECTS){
    expect(project.overview.en.length).toBeGreaterThan(50)
    expect(project.overview.ta.length).toBeGreaterThan(30)
    expect(project.stack.length).toBeGreaterThan(0)
    for(const media of project.media){
      const record=records.find(row=>'projects/'+row.file===media.src)
      expect(record).toBeDefined()
      const bytes=await readFile(new URL('../public/'+media.src,import.meta.url))
      expect(bytes.subarray(0,4).toString()).toBe('RIFF')
      expect(bytes.subarray(8,12).toString()).toBe('WEBP')
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256)
      expect(record.source).toMatch(/^https:\/\/raw\.githubusercontent\.com\/thulasiramk-2310\//)
    }
  }
})

it('leaves real wheel clearance in the stamped apron and fills the roof/glass header gap',()=>{
  const apron=new THREE.Mesh(roundedNoseGeometry(),new THREE.MeshBasicMaterial())
  apron.updateMatrixWorld(true)
  const ray=new THREE.Raycaster(new THREE.Vector3(0,.55,2),new THREE.Vector3(0,0,-1))
  expect(ray.intersectObject(apron)).toHaveLength(0)
  ray.ray.origin.set(.4,.55,2);expect(ray.intersectObject(apron).length).toBeGreaterThan(0)
  const header=new THREE.Mesh(canopyValanceGeometry(),new THREE.MeshBasicMaterial())
  header.updateMatrixWorld(true);ray.ray.origin.set(0,1.80,2)
  expect(ray.intersectObject(header).length).toBeGreaterThan(0)
  for(const geometry of [apron.geometry,header.geometry,frontFasciaGeometry()]){
    expect(geometry.attributes.position.array.every(Number.isFinite)).toBe(true)
    expect(geometry.attributes.normal.array.every(Number.isFinite)).toBe(true)
  }
})
