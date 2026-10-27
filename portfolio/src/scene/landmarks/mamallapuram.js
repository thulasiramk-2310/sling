// Mamallapuram: Shore Temple, rathas and an original volumetric stone elephant study.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { quality } from '../quality.js'
import { grainTexture, stoneTexture, vimanaWallTexture, withRelief } from '../textures.js'
import { block, rng, surface, uvScale } from '../util.js'
import { goldMaterial } from './gopuram.js'
import { dravidaTower } from './shrines.js'
import { createStoneElephant } from './elephant.js'
import { rockGeometry } from './rocks.js'
import { nandiGeometry } from './nandi.js'
import { createRathas } from './rathas.js'
import { createMonumentGarden } from './monument-garden.js'

// Weathered sea-worn granite, with relief so the blocks and carvings catch the light.
function graniteSet() {
  const relief = (name, make) => {
    const t = withRelief(name, make, 2.6)
    return surface({ map: t.map, normalMap: quality.low ? null : t.normalMap, roughness: 0.95 })
  }
  return { stone: relief('shore-stone', () => stoneTexture('#8b8782', 6)), wall: relief('shore-wall', () => vimanaWallTexture('#918c84')) }
}

function shoreTemple() {
  const g = new THREE.Group()
  g.userData.staticBatchRoot = true
  const { stone, wall } = graniteSet()
  // a deep foundation, because the temple stands where the beach slopes into the sea
  const base = block(36, 4.2, 24, stone, 0, -3)
  uvScale(base.geometry, 6, 1.6)
  g.add(base)
  // the taller shrine faces the sea, the smaller one faces the land
  const big = dravidaTower({ base: 10, tiers: 4, wallH: 4.2, tierH: 2.4, mat: stone, wallMat: wall, finialMat: goldMaterial() })
  big.position.set(-6, 1.2, -1)
  const small = dravidaTower({ base: 6.5, tiers: 3, wallH: 3.2, tierH: 1.9, mat: stone, wallMat: wall, finialMat: goldMaterial() })
  small.position.set(9, 1.2, 1.5)
  g.add(big, small)
  const hall = block(9, 3.6, 7, wall, 1.8, 1.2, 4)
  uvScale(hall.geometry, 1.4, 0.6)
  g.add(hall)
  // low enclosure wall topped with a row of seated bulls (nandis)
  g.add(block(36, 1.6, 0.9, stone, 0, 1.2, 11.2))
  const bull = new THREE.InstancedMesh(nandiGeometry(true), stone, 11)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 11; i++) {
    m.makeScale(.24, .24, .24).setPosition(-16 + i * 3.2, 2.8, 11.2)
    bull.setMatrixAt(i, m)
  }
  g.add(bull)
  return g
}

// An original stone elephant study against weathered granite. No animal drawing,
// billboard, or image of a sculpture is used anywhere in this assembly.
function carvings() {
  const g = new THREE.Group()
  const relief = withRelief('elephant-granite',grainTexture,.8)
  const rock = surface({ color: 0x9c9384, normalMap: quality.low ? null : relief.normalMap, roughness: .96 })
  const elephant = createStoneElephant(rock,quality.low)
  elephant.position.set(0,0,2)
  g.add(elephant)
  const r = rng(12)
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(rockGeometry(3.5+r()*1.5,12+i,quality.low),rock)
    b.scale.set(1.25,1,.8)
    b.position.set(-9+i*5,2.3,-3.5-r()*2)
    g.add(b)
  }
  g.userData.elephant = elephant
  return g
}

export function buildMamallapuram({ scene, route, u, ground }) {
  const world = new THREE.Group()
  scene.add(world)
  const add = (obj, du, lateral) => {
    obj.position.copy(route.side(u + du, lateral))
    faceRoad(obj, route, u + du)
    world.add(obj)
  }
  const temple = shoreTemple()
  add(temple, 0, 84)
  const elephantGarden = carvings()
  add(elephantGarden, -0.04, 42)
  const materials = graniteSet()
  add(createRathas(materials.stone, materials.wall), 0, 52)
  world.add(createMonumentGarden(route,u,materials.stone,ground))
  return { focus: route.side(u, 76, 8), slots: [{ name: 'shore-temple', group: temple, height: 18 }, { name: 'mamallapuram-elephant', group: elephantGarden.userData.elephant, height: 4.1 }], update() {} }
}
