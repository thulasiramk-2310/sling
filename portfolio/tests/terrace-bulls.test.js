import { afterEach, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import { buildThanjavur } from '../src/scene/landmarks/thanjavur.js'
import { createTerraceBulls, terraceBullGeometry } from '../src/scene/landmarks/terrace-bulls.js'
import { createRoute } from '../src/scene/route.js'
import { nandiGeometry } from '../src/scene/landmarks/nandi.js'
import { updateDetailLods } from '../src/scene/detail-lod.js'
import { batchStaticMeshes } from '../src/scene/batch.js'
import { quality } from '../src/scene/quality.js'

vi.mock('../src/scene/textures.js', () => ({
  stoneTexture: () => null, vimanaWallTexture: () => null, grainTexture: () => null,
  withRelief: () => ({ map: null, normalMap: null }),
}))
const original = { ...quality }
afterEach(() => Object.assign(quality, original))

it('preserves all 119 pre-change terrace transforms and leaves the hero Nandi untouched', () => {
  quality.low = false
  const scene = new THREE.Scene(); buildThanjavur({ scene, route: createRoute(), u: .47 })
  const terraces = scene.getObjectByName('Thanjavur terrace Nandi ornaments')
  const hero = scene.getObjectByName('Great Nandi beneath the mandapam')
  const heroGeometry = hero.geometry, rows = [], matrix = new THREE.Matrix4()
  for (const mesh of terraces.children) {
    expect(mesh.geometry).toBe(nandiGeometry(true))
    expect(mesh.boundingSphere.radius).toBeLessThan(30)
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); rows.push(matrix.elements.join(',')) }
  }
  expect(rows).toHaveLength(119)
  // Captured from the original unpartitioned instancer before this change.
  expect(createHash('sha256').update(rows.sort().join('\n')).digest('hex')).toBe('cc7f769a2625fb0d4783c88eea0c4127c60367b97cf4be22acd64a7d47632bc7')
  const children = [...terraces.children]
  batchStaticMeshes(scene)
  expect(terraces.children).toEqual(children)
  scene.updateMatrixWorld(true)
  const camera = new THREE.PerspectiveCamera(60, 1.6, .1, 20000)
  camera.position.set(0, 10, 10000); camera.lookAt(terraces.getWorldPosition(new THREE.Vector3()))
  updateDetailLods(scene, camera, 900)
  expect(terraces.children.every(mesh => mesh.geometry === terraceBullGeometry(true))).toBe(true)
  expect(hero.geometry).toBe(heroGeometry)
  expect(hero.geometry).toBe(nandiGeometry(false))
})

it('keeps the original nearby geometry and switches only distant ornament detail', () => {
  const matrix = new THREE.Matrix4().makeScale(.25, .25, .25)
  const group = createTerraceBulls([matrix], new THREE.MeshStandardMaterial())
  const mesh = group.children[0], before = [...mesh.instanceMatrix.array]
  const camera = new THREE.PerspectiveCamera(60, 1.6, .1, 2000)
  group.updateMatrixWorld(true)
  for (const [distance, geometry] of [[20, nandiGeometry(true)], [100, terraceBullGeometry()], [1000, terraceBullGeometry(true)], [20, nandiGeometry(true)]]) {
    camera.position.set(0, .4, distance); camera.lookAt(0, .4, 0)
    updateDetailLods(group, camera, 900)
    expect(mesh.geometry).toBe(geometry)
    expect([...mesh.instanceMatrix.array]).toEqual(before)
    expect(mesh.count).toBe(1)
  }
})

it('retains a finite bovine silhouette and matching bounds at a lower proxy budget', () => {
  for (const [far, budget] of [[false, 300], [true, 150]]) {
    const geometry = terraceBullGeometry(far)
    expect(geometry.attributes.position.count / 3).toBeLessThanOrEqual(budget)
    expect(geometry.attributes.position.array.every(Number.isFinite)).toBe(true)
    expect(geometry.attributes.normal.array.every(Number.isFinite)).toBe(true)
    expect(geometry.boundingBox.min.toArray()).toEqual(nandiGeometry(true).boundingBox.min.toArray())
    expect(geometry.boundingBox.max.toArray()).toEqual(nandiGeometry(true).boundingBox.max.toArray())
  }
})
