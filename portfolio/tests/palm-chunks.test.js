import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import { buildPalms } from '../src/scene/world.js'
import { createRoute } from '../src/scene/route.js'
import { quality } from '../src/scene/quality.js'

vi.mock('../src/scene/textures.js', () => ({
  glowTexture: () => null, grainTexture: () => null, roadTexture: () => null,
  seaNormalTexture: () => null, trunkTexture: () => null,
}))
const original = { ...quality }
afterEach(() => Object.assign(quality, original))

// Captured from the unpartitioned buildPalms before this change. Include every
// float32 transform component and crown colour, independent of instance order.
const fixtures = [
  [false, 260, '4c219a4de2666c3c75093ece425be94e793ab4e5e986574a629067619b160e35'],
  [true, 90, '84da7ad50f447c26a402dc9ebbc80b4b949bddc86df35ac8229fc00989c80503'],
]
for (const [low, count, expected] of fixtures) it(`preserves all original ${low ? 'phone' : 'desktop'} palm transforms and colours`, () => {
  Object.assign(quality, { low, palms: count })
  const scene = new THREE.Scene(), { crowns } = buildPalms(scene, createRoute())
  const trunks = scene.getObjectByName('Spatial palm trunks')
  const matrix = new THREE.Matrix4(), color = new THREE.Color(), rows = []
  expect(crowns.isGroup).toBe(true)
  expect(crowns.children.length).toBeGreaterThan(10)
  expect(trunks.children).toHaveLength(crowns.children.length)
  for (const [chunkIndex, chunk] of crowns.children.entries()) {
    const trunk = trunks.children[chunkIndex]
    expect(chunk.geometry).toBe(crowns.children[0].geometry)
    expect(chunk.material).toBe(crowns.children[0].material)
    expect(trunk.geometry).toBe(trunks.children[0].geometry)
    expect(trunk.material).toBe(trunks.children[0].material)
    expect(chunk.boundingSphere.radius).toBeLessThan(95)
    for (let i = 0; i < chunk.count; i++) {
      chunk.getMatrixAt(i, matrix); chunk.getColorAt(i, color)
      rows.push([...matrix.elements, ...color.toArray()].join(','))
      const trunkMatrix = new THREE.Matrix4(); trunk.getMatrixAt(i, trunkMatrix)
      expect(trunkMatrix.elements).toEqual(matrix.elements)
    }
  }
  expect(rows).toHaveLength(count)
  expect(createHash('sha256').update(rows.sort().join('\n')).digest('hex')).toBe(expected)
})

it('actually culls remote chunks while keeping the near palm in the camera frustum', () => {
  Object.assign(quality, { low: false, palms: 260 })
  const scene = new THREE.Scene(), { crowns } = buildPalms(scene, createRoute())
  scene.updateMatrixWorld(true)
  const chunk = crowns.children[0], matrix = new THREE.Matrix4()
  chunk.getMatrixAt(0, matrix)
  const target = new THREE.Vector3().setFromMatrixPosition(matrix).add(new THREE.Vector3(0, 9, 0))
  const camera = new THREE.PerspectiveCamera(52, 1.6, .1, 140)
  camera.position.copy(target).add(new THREE.Vector3(0, 5, 45)); camera.lookAt(target); camera.updateMatrixWorld(true)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  expect(frustum.intersectsObject(chunk)).toBe(true)
  const submitted = crowns.children.filter(mesh => frustum.intersectsObject(mesh)).reduce((sum, mesh) => sum + mesh.count, 0)
  expect(submitted).toBeGreaterThan(0)
  expect(submitted).toBeLessThan(260 / 3)
  crowns.visible = false
  const visible = []; scene.traverseVisible(object => { if (object.isInstancedMesh && object.name.startsWith('Palm crowns')) visible.push(object) })
  expect(visible).toHaveLength(0)
})
