import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Body } from '../data/bodies'
import { registry } from '../core/input'
import { haloFragment, haloVertex, planetVertex, sunFragment } from './shaders'

export function Sun({ body }: { body: Body }) {
  const anchor = useRef<THREE.Group>(null!)
  const core = useRef<THREE.Mesh>(null!)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: sunFragment,
        uniforms: { uTime: { value: 0 } },
        toneMapped: false,
      }),
    [],
  )

  const corona = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: {
          uColor: { value: new THREE.Color('#ff8a2a') },
          uStrength: { value: 2.2 },
          uLit: { value: 0 },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  useEffect(() => {
    core.current.userData.bodyId = body.id
    registry.set(body.id, { anchor: anchor.current, hit: core.current })
    return () => {
      registry.delete(body.id)
    }
  }, [body])

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt
    core.current.rotation.y += dt * body.spin
  })

  return (
    <group ref={anchor}>
      <mesh ref={core} material={material}>
        <sphereGeometry args={[body.radius, 96, 64]} />
      </mesh>
      <mesh material={corona} scale={1.6}>
        <sphereGeometry args={[body.radius, 64, 48]} />
      </mesh>
    </group>
  )
}
