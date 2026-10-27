import * as THREE from 'three'
import { quality } from '../quality.js'
import { block, surface } from '../util.js'

// Human-scale details on the Marina approach. All dimensions are metres.
// These original assemblies are merged with the other static architecture at load.
export function createPromenade(route) {
  const group = new THREE.Group()
  const addAssembly = (assembly) => {
    assembly.updateMatrix()
    for (const mesh of [...assembly.children]) {
      mesh.applyMatrix4(assembly.matrix)
      group.add(mesh)
    }
  }
  const paving = surface({ color: 0xb7aa94, roughness: 0.96 })
  const curb = surface({ color: 0xe0d6bf, roughness: 0.93 })
  const dark = surface({ color: 0x454844, roughness: 0.88 })
  const wood = surface({ color: 0x69513c, roughness: 0.83 })
  const steel = surface({ color: 0x454a46, roughness: 0.53, metalness: 0.5 })
  const start = 0.012
  const end = 0.15
  const count = Math.ceil((end - start) * route.length / 2)
  const s = route.sample()
  for (let i = 0; i < count; i++) {
    const u = start + (i + 0.5) / count * (end - start)
    route.at(u, s)
    const section = new THREE.Group()
    section.position.copy(route.side(u, 9.6))
    section.rotation.y = Math.atan2(s.tan.x, s.tan.z)
    section.add(block(4.4, 0.18, 2.05, paving))
    for (const x of [-2.25, 2.25]) section.add(block(0.22, 0.3, 2.05, i % 2 ? dark : curb, x))
    // The front edge of each paving slab and the curb remain separate silhouettes.
    addAssembly(section)
  }
  const benches = quality.low ? 5 : 10
  for (let i = 0; i < benches; i++) {
    const u = start + (i + 0.5) / benches * (end - start)
    route.at(u, s)
    const bench = new THREE.Group()
    bench.position.copy(route.side(u, 10.8, 0.18))
    bench.rotation.y = Math.atan2(-s.right.x, -s.right.z)
    for (const z of [-0.2, 0, 0.2]) bench.add(block(1.8, 0.065, 0.15, wood, 0, 0.46, z))
    for (const y of [0.7, 0.88, 1.06]) bench.add(block(1.8, 0.13, 0.06, wood, 0, y, -0.27))
    for (const x of [-0.65, 0.65]) {
      bench.add(block(0.07, 1.12, 0.07, steel, x, 0, -0.27))
      bench.add(block(0.07, 0.46, 0.07, steel, x, 0, 0.23))
      bench.add(block(0.07, 0.06, 0.65, steel, x, 0.67))
    }
    addAssembly(bench)
  }
  return group
}
