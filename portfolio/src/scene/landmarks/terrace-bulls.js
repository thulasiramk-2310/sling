import * as THREE from 'three'
import { registerDetailLod } from '../detail-lod.js'
import { nandiGeometry } from './nandi.js'
import { combineStone } from './stonework.js'

const cache = new Map()
// Original bovine silhouette proxies retain the recumbent body, shoulder hump,
// raised head, muzzle, horns and plinth of the small roof ornaments.
export function terraceBullGeometry(far = false) {
  if (cache.has(far)) return cache.get(far)
  const parts = []
  const oval = (position, scale, body = false) => {
    const geometry = far ? new THREE.OctahedronGeometry(1) : new THREE.SphereGeometry(1, body ? 8 : 6, body ? 4 : 3)
    geometry.scale(...scale).translate(...position); parts.push(geometry)
  }
  for (const [index, form] of [
    [-.45, 1.05, 0, 1.65, .85, .82], [-1.4, .7, 0, .8, .65, .8],
    [.55, 1.8, 0, .6, .72, .64], [1.2, 1.45, 0, .55, .9, .58],
    [1.75, 2.08, 0, .57, .54, .46], [2.16, 1.9, 0, .54, .3, .39],
  ].entries()) oval(form.slice(0, 3), form.slice(3), index === 0)
  for (const side of [-1, 1]) {
    const leg = new THREE.BoxGeometry(2.1, .36, .48)
    leg.translate(-.3, .22, side * .64); parts.push(leg)
    oval([1.7, 2.15, side * .57], [.28, .098, .50])
    const horn = new THREE.ConeGeometry(.12, .7, far ? 3 : 4)
    horn.rotateX(side * .38).rotateZ(-.2).translate(1.58, 2.7, side * .32); parts.push(horn)
  }
  const plinth = new THREE.BoxGeometry(5.8, .3, 2.55)
  plinth.translate(0, -.11, 0); parts.push(plinth)
  const geometry = combineStone(parts)
  // Keep the new curved-horn envelope identical across detail levels, so
  // changing roof ornament LOD cannot shorten its silhouette or foot level.
  const target=nandiGeometry(true).boundingBox,source=geometry.boundingBox.clone()
  const positions=geometry.attributes.position
  for(let i=0;i<positions.count;i++){
    const y=positions.getY(i)
    positions.setY(i,y===source.max.y?target.max.y:y===source.min.y?target.min.y:
      target.min.y+(y-source.min.y)/(source.max.y-source.min.y)*(target.max.y-target.min.y))
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere()
  geometry.name = far ? 'Terrace bull distant silhouette' : 'Terrace bull medium silhouette'
  cache.set(far, geometry)
  return geometry
}

export function createTerraceBulls(matrices, material) {
  const group = new THREE.Group(), bins = new Map(), position = new THREE.Vector3()
  group.name = 'Thanjavur terrace Nandi ornaments'; group.userData.preserveAssembly = true
  const near = nandiGeometry(true), levels = [near, terraceBullGeometry(), terraceBullGeometry(true)]
  for (const matrix of matrices) {
    position.setFromMatrixPosition(matrix)
    const key = `${Math.floor(position.x / 30)}:${Math.floor(position.z / 30)}`
    if (!bins.has(key)) bins.set(key, [])
    bins.get(key).push(matrix)
  }
  for (const [key, placements] of bins) {
    const mesh = new THREE.InstancedMesh(near, material, placements.length)
    mesh.name = `Terrace Nandi ${key}`
    let scale = 0
    placements.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); scale = Math.max(scale, matrix.getMaxScaleOnAxis()) })
    mesh.computeBoundingBox(); mesh.computeBoundingSphere()
    registerDetailLod(mesh, {
      levels, center: mesh.boundingBox.getCenter(new THREE.Vector3()),
      height: (near.boundingBox.max.y - near.boundingBox.min.y) * scale, thresholds: [30, 3],
    })
    group.add(mesh)
  }
  return group
}
