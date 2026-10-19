// Miniature shrines that crown every tier of a South Indian temple tower.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// A miniature shrine: square cell with a domed roof (a "kuta"), used along every tier.
export function kutaGeometry() {
  const cell = new THREE.BoxGeometry(1, 0.9, 1)
  cell.translate(0, 0.45, 0)
  const ledge = new THREE.BoxGeometry(1.25, 0.14, 1.25)
  ledge.translate(0, 0.97, 0)
  const dome = new THREE.SphereGeometry(0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)
  dome.scale(1, 0.85, 1)
  dome.translate(0, 1.04, 0)
  const tip = new THREE.ConeGeometry(0.12, 0.35, 6)
  tip.translate(0, 1.7, 0)
  return mergeGeometries([cell, ledge, dome, tip])
}

// A miniature oblong shrine with a barrel roof (a "sala").
export function salaGeometry() {
  const cell = new THREE.BoxGeometry(2, 0.9, 0.95)
  cell.translate(0, 0.45, 0)
  const ledge = new THREE.BoxGeometry(2.2, 0.14, 1.15)
  ledge.translate(0, 0.97, 0)
  const roof = new THREE.CylinderGeometry(0.52, 0.52, 2, 10, 1, false, 0, Math.PI)
  roof.rotateZ(Math.PI / 2)
  roof.translate(0, 1.04, 0)
  return mergeGeometries([cell, ledge, roof])
}

// Octagonal bulb of the cupola (the famous single-stone dome), as a turned profile with 8 sides.
export function cupolaGeometry() {
  const pts = [
    [0.01, 0],
    [4.9, 0],
    [5.6, 0.9],
    [5.9, 2.0],
    [5.4, 3.4],
    [4.0, 4.8],
    [2.0, 5.7],
    [0.6, 6.0],
    [0.01, 6.05],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  return new THREE.LatheGeometry(pts, 8)
}

// A Dravida temple tower in the Pallava style (Shore Temple, the rathas): a square shrine, then
// diminishing tiers each ringed by miniature shrines, an octagonal neck, a cupola and a finial.
export function dravidaTower({ base, tiers, wallH, tierH, mat, wallMat = mat, finialMat }) {
  const g = new THREE.Group()
  const box = (w, h, d, m, y) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.position.y = y + h / 2
    g.add(mesh)
  }
  box(base + 1.2, 0.6, base + 1.2, mat, 0)
  box(base, wallH, base, wallMat, 0.6)
  let y = 0.6 + wallH
  box(base + 0.8, 0.35, base + 0.8, mat, y)
  y += 0.35
  const kutas = new THREE.InstancedMesh(kutaGeometry(), mat, (tiers + 1) * 4)
  const salas = new THREE.InstancedMesh(salaGeometry(), mat, (tiers + 1) * 8)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let k = 0
  let n = 0
  let w = base
  const ring = (top, width) => {
    const s = Math.max(0.35, width * 0.12)
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      m.compose(new THREE.Vector3((cx * (width - s)) / 2, top, (cz * (width - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
      kutas.setMatrixAt(k++, m)
    }
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a)
      for (const along of [-0.22, 0.22]) {
        const p = new THREE.Vector3(along * width, top, (width - s) / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
        m.compose(p, q, new THREE.Vector3(s, s, s))
        salas.setMatrixAt(n++, m)
      }
    }
    return s
  }
  ring(y, w)
  for (let i = 0; i < tiers; i++) {
    w *= 0.74
    box(w, tierH, w, wallMat, y)
    y += tierH
    box(w + 0.4, 0.25, w + 0.4, mat, y)
    y += 0.25
    ring(y, w)
  }
  kutas.count = k
  salas.count = n
  g.add(kutas, salas)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.32, tierH * 0.5, 8), wallMat)
  neck.position.y = y + tierH * 0.25
  g.add(neck)
  y += tierH * 0.5
  const dome = new THREE.Mesh(cupolaGeometry(), mat)
  const k2 = (w * 0.42) / 5.9
  dome.scale.setScalar(k2)
  dome.position.y = y
  g.add(dome)
  y += 6 * k2
  const fin = new THREE.Mesh(new THREE.ConeGeometry(w * 0.06, w * 0.28, 8), finialMat ?? mat)
  fin.position.y = y + w * 0.12
  g.add(fin)
  g.userData.height = y + w * 0.28
  return g
}
