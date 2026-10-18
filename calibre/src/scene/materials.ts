import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartId } from '../data/parts'
import { useStore } from '../store'

const std = (color: string, metalness: number, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  new THREE.MeshPhysicalMaterial({ color, metalness, roughness, emissive: color, emissiveIntensity: 0, ...extra })

export const makeGilt = () => std('#dcb46e', 0.92, 0.3)
export const makeSteel = () => std('#e4e8ee', 0.85, 0.22)
export const makeBlued = () => std('#2547a8', 0.85, 0.22, { clearcoat: 0.6 })
export const makeRuby = () => std('#c0122e', 0.05, 0.08, { clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4 })
export const makeRhodium = () => std('#c4c9d0', 0.8, 0.34)

const tmp = new THREE.Color()
const { damp } = THREE.MathUtils

// Dims everything except the selected part and warms the hovered one, without swapping materials.
export function usePartLook(id: PartId, materials: THREE.MeshPhysicalMaterial[]) {
  const base = useMemo(() => materials.map((m) => m.color.clone()), [materials])
  useFrame((_, dt) => {
    const { selected, hovered } = useStore.getState()
    const dim = selected && selected !== id ? 0.22 : 1
    const glow = selected === id ? 0.12 : hovered === id ? 0.16 : 0
    const k = 1 - Math.exp(-dt * 8)
    materials.forEach((m, i) => {
      m.color.lerp(tmp.copy(base[i]).multiplyScalar(dim), k)
      m.emissiveIntensity = damp(m.emissiveIntensity, glow, 8, dt)
    })
  })
}
