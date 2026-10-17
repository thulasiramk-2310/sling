import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { orbitAngle, type Body } from '../data/bodies'
import { input, registry } from '../core/input'
import { useStore } from '../core/store'
import {
  haloFragment,
  haloVertex,
  planetFragment,
  planetVertex,
  ringFragment,
  ringVertex,
} from './shaders'

const KIND: Record<Body['kind'], number> = { rocky: 0, earth: 1, gas: 2, ice: 3, star: 0 }

export function Planet({ body }: { body: Body }) {
  const anchor = useRef<THREE.Group>(null!)
  const spinner = useRef<THREE.Mesh>(null!)
  const hit = useRef<THREE.Mesh>(null!)
  const active = useStore((s) => s.hoveredId === body.id || s.selectedId === body.id)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uA: { value: new THREE.Color(body.colors[0]) },
          uB: { value: new THREE.Color(body.colors[1]) },
          uC: { value: new THREE.Color(body.colors[2]) },
          uAtmo: { value: new THREE.Color(body.atmosphere) },
          uKind: { value: KIND[body.kind] },
          uTime: { value: 0 },
          uSeed: { value: body.phase * 3.7 },
          uHover: { value: 0 },
        },
      }),
    [body],
  )

  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: {
          uColor: { value: new THREE.Color(body.atmosphere) },
          uStrength: { value: body.kind === 'earth' ? 1.6 : 1.0 },
          uLit: { value: 1 },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [body],
  )

  const ring = useMemo(() => {
    if (!body.rings) return null
    const inner = body.radius * 1.35
    const outer = body.radius * 2.4
    return {
      geometry: new THREE.RingGeometry(inner, outer, 160, 1),
      material: new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uInner: { value: inner },
          uOuter: { value: outer },
          uColor: { value: new THREE.Color(body.colors[1]) },
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    }
  }, [body])

  const orbitPoints = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2
      pts.push([Math.cos(a) * body.orbit, 0, -Math.sin(a) * body.orbit])
    }
    return pts
  }, [body])

  useEffect(() => {
    hit.current.userData.bodyId = body.id
    registry.set(body.id, { anchor: anchor.current, hit: hit.current })
    return () => {
      registry.delete(body.id)
    }
  }, [body])

  useFrame((_, dt) => {
    const a = orbitAngle(body, input.simTime)
    anchor.current.position.set(Math.cos(a) * body.orbit, 0, -Math.sin(a) * body.orbit)
    spinner.current.rotation.y += dt * body.spin * 0.3
    const u = material.uniforms
    u.uTime.value += dt
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, active ? 1 : 0, 6, dt)
  })

  return (
    <>
      <Line
        points={orbitPoints}
        color={active ? '#cfe3ff' : '#7f93b8'}
        lineWidth={active ? 1.6 : 1}
        transparent
        opacity={active ? 0.55 : 0.14}
      />
      <group ref={anchor}>
        <group rotation={[0, 0, body.tilt]}>
          <mesh ref={spinner} material={material}>
            <sphereGeometry args={[body.radius, 96, 64]} />
          </mesh>
          <mesh material={halo} scale={body.kind === 'earth' ? 1.18 : 1.12}>
            <sphereGeometry args={[body.radius, 64, 48]} />
          </mesh>
          {ring && (
            <mesh
              geometry={ring.geometry}
              material={ring.material}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          )}
        </group>
        <mesh ref={hit}>
          <sphereGeometry args={[Math.max(body.radius * 1.6, 1.3), 16, 12]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
