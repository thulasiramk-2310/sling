import * as THREE from 'three'
import { block, column } from '../util.js'

// Original, code-built interpretation of Marina's triangular RCC lighthouse.
// 46 m overall height; the dimensions below are art-directed, not survey data.
// Source for silhouette/height: DGLL Chennai Lighthouse, linked in docs/visual-review.md.
export function createLighthouse({ white, red, metal, glass, dark, lamp }) {
  const group = new THREE.Group()
  group.name = 'Marina triangular lighthouse'
  group.add(column(7.4, 7.8, 1, white, 0, 0, 0, 3))
  for (let i = 0; i < 6; i++) {
    const bottom = 5.7 - i * 1.4 / 6
    const top = 5.7 - (i + 1) * 1.4 / 6
    group.add(column(top, bottom, 6.5, i % 2 ? red : white, 0, 1 + i * 6.5, 0, 3))
  }

  // Recessed glazing, reveals and concrete mullions on all three flat faces.
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 1.35, 0.09), glass, 33)
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.6, 0.12), dark, 33)
  const matrix = new THREE.Matrix4()
  const rotation = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  let n = 0
  for (let side = 0; side < 3; side++) {
    const a = (side + 0.5) * Math.PI * 2 / 3
    rotation.setFromAxisAngle(up, a)
    for (let floor = 0; floor < 11; floor++) {
      const y = 3.2 + floor * 3.2
      const radius = (5.7 - (y - 1) * 1.4 / 39) * 0.5
      const p = new THREE.Vector3(Math.sin(a) * (radius + 0.02), y, Math.cos(a) * (radius + 0.02))
      matrix.compose(p, rotation, new THREE.Vector3(1, 1, 1))
      frames.setMatrixAt(n, matrix)
      p.addScaledVector(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 0.08)
      matrix.setPosition(p)
      windows.setMatrixAt(n++, matrix)
    }
  }
  group.add(frames, windows)
  group.add(column(6.1, 5.9, 0.65, white, 0, 40, 0, 3))
  group.add(column(4.7, 4.7, 0.2, metal, 0, 41.85, 0, 24))
  group.add(column(2.5, 2.5, 2.7, glass, 0, 42.05, 0, 24))
  group.add(column(1.1, 1.1, 1.8, lamp, 0, 42.4, 0, 24))
  group.add(column(3.1, 3.1, 0.25, red, 0, 44.75, 0, 24))
  group.add(column(0.2, 3.1, 0.85, red, 0, 45, 0, 24))
  group.add(column(0.08, 0.08, 0.15, metal, 0, 45.85, 0, 8))

  // Gallery railings and lantern mullions are geometry, so their shadows are real.
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), metal, 36)
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI * 2 / 36
    posts.setMatrixAt(i, matrix.makeTranslation(Math.sin(a) * 4.35, 41.25, Math.cos(a) * 4.35))
  }
  group.add(posts)
  for (const y of [40.85, 41.75]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(4.35, 0.045, 5, 48), metal)
    rail.rotation.x = Math.PI / 2
    rail.position.y = y
    group.add(rail)
  }
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI * 2 / 12
    group.add(column(0.045, 0.045, 2.7, metal, Math.sin(a) * 2.52, 42.05, Math.cos(a) * 2.52, 6))
  }
  const service = block(7, 4, 6, white, 0, 0, -6)
  group.add(service, block(1.6, 2.8, 0.12, dark, 0, 0.15, -9.06))
  group.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true })
  return group
}
