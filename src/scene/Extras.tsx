import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Body } from '../data/bodies'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { planetFragment, planetVertex } from './shaders'

export function makeSurface(colors: [string, string, string], atmosphere: string, kind: number, seed: number) {
  return new THREE.ShaderMaterial({
    vertexShader: planetVertex,
    fragmentShader: planetFragment,
    uniforms: {
      uA: { value: new THREE.Color(colors[0]) },
      uB: { value: new THREE.Color(colors[1]) },
      uC: { value: new THREE.Color(colors[2]) },
      uAtmo: { value: new THREE.Color(atmosphere) },
      uKind: { value: kind },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uHover: { value: 0 },
    },
  })
}

export function Label({ body }: { body: Body }) {
  const show = useStore((s) => s.phase === 'explore' && !s.selectedId)
  const hot = useStore((s) => s.hoveredId === body.id)
  return (
    <Html
      position={[0, body.radius + (body.rings ? 1.2 : 0.7), 0]}
      center
      zIndexRange={[4, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className={`planet-label ${show ? 'on' : ''} ${hot ? 'hot' : ''}`}>
        <span>{body.name}</span>
      </div>
    </Html>
  )
}

const { damp } = THREE.MathUtils

// Camera-facing targeting brackets that bloom in around the hovered or selected world.
export function Reticle({ body }: { body: Body }) {
  const group = useRef<THREE.Group>(null!)
  const arcs = useRef<THREE.Group>(null!)
  const r = body.radius * (body.rings ? 2.7 : 1.5)
  const w = Math.max(r * 0.0045, 0.012)

  const materials = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: body.atmosphere,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [body],
  )

  useFrame(({ camera }, dt) => {
    const { selectedId, hoveredId } = useStore.getState()
    const sel = selectedId === body.id
    const hov = hoveredId === body.id
    group.current.quaternion.copy(camera.quaternion)
    arcs.current.rotation.z -= dt * (sel ? 0.5 : 1.2)
    materials[0].opacity = damp(materials[0].opacity, sel ? 0.22 : hov ? 0.18 : 0, 6, dt)
    materials[1].opacity = damp(materials[1].opacity, sel ? 0.75 : hov ? 0.55 : 0, 6, dt)
    group.current.scale.setScalar(damp(group.current.scale.x, sel || hov ? 1 : 1.35, 7, dt))
    group.current.visible = materials[1].opacity > 0.01
  })

  return (
    <group ref={group} visible={false}>
      <mesh material={materials[0]}>
        <ringGeometry args={[r, r + w, 128]} />
      </mesh>
      <group ref={arcs}>
        {[0, Math.PI * (2 / 3), Math.PI * (4 / 3)].map((start) => (
          <mesh key={start} material={materials[1]}>
            <ringGeometry args={[r * 1.07, r * 1.07 + w * 2.5, 48, 1, start, Math.PI * 0.42]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function Moon({ parentRadius }: { parentRadius: number }) {
  const orbit = useRef<THREE.Group>(null!)
  const material = useMemo(() => makeSurface(['#55524e', '#8a8680', '#bdb8b0'], '#c9c4bb', 0, 9.1), [])
  useFrame(() => {
    orbit.current.rotation.y = input.simTime * 1.4
  })
  return (
    <group ref={orbit} rotation={[0.09, 0, 0]}>
      <mesh material={material} position={[parentRadius * 2.4, 0, 0]}>
        <sphereGeometry args={[parentRadius * 0.27, 48, 32]} />
      </mesh>
    </group>
  )
}

export function AsteroidBelt() {
  const points = useRef<THREE.Points>(null!)
  const geometry = useMemo(() => {
    const count = 3200
    const pos = new Float32Array(count * 3)
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const r = 20.6 + (rand() + rand() + rand()) * 1.0
      const a = rand() * Math.PI * 2
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = (rand() - 0.5) * 0.55
      pos[i * 3 + 2] = -Math.sin(a) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame(() => {
    points.current.rotation.y = input.simTime * 0.025
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.08} color="#b9ad9b" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  )
}
