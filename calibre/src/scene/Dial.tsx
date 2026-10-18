import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POS } from '../data/parts'
import { sim } from '../sim'
import { extrudeFlat, ringShape } from './geometry'

function dialTexture() {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const mid = size / 2
  const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid)
  g.addColorStop(0, '#24407a')
  g.addColorStop(0.65, '#132a57')
  g.addColorStop(1, '#0a1733')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // Sunburst finish: fine radial brushing that catches the light.
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(mid, mid)
    ctx.lineTo(mid + Math.cos(a) * mid, mid + Math.sin(a) * mid)
    ctx.stroke()
  }
  // Minute track.
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const r0 = mid * (i % 5 === 0 ? 0.885 : 0.9)
    ctx.strokeStyle = 'rgba(232,214,170,0.85)'
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.5
    ctx.beginPath()
    ctx.moveTo(mid + Math.cos(a) * r0, mid + Math.sin(a) * r0)
    ctx.lineTo(mid + Math.cos(a) * mid * 0.93, mid + Math.sin(a) * mid * 0.93)
    ctx.stroke()
  }
  ctx.fillStyle = '#ecdcb4'
  ctx.textAlign = 'center'
  ctx.font = '600 44px "Bodoni Moda", Didot, Georgia, serif'
  ctx.fillText('CALIBRE', mid, mid - 250)
  ctx.font = '500 18px "IBM Plex Mono", ui-monospace, monospace'
  ctx.fillStyle = 'rgba(236,220,180,0.75)'
  ctx.fillText('C-28  ·  HAND-WOUND', mid, mid - 218)
  ctx.fillText('28 800 A/h  ·  21 RUBIS', mid, mid + 300)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.center.set(0.5, 0.5)
  t.rotation = -Math.PI / 2
  return t
}

function handShape(length: number, width: number, tail: number) {
  const s = new THREE.Shape()
  s.moveTo(-tail, -width * 0.55)
  s.lineTo(0, -width)
  s.lineTo(length * 0.92, -width * 0.25)
  s.lineTo(length, 0)
  s.lineTo(length * 0.92, width * 0.25)
  s.lineTo(0, width)
  s.lineTo(-tail, width * 0.55)
  s.closePath()
  return s
}

// The dial sits on the underside of the movement. Seen from below, 12 o'clock is +z and 3 o'clock is the crown (+x).
const clock = (fraction: number) => fraction * Math.PI * 2 - Math.PI / 2

export function Dial() {
  const group = useRef<THREE.Group>(null!)
  const hour = useRef<THREE.Mesh>(null!)
  const minute = useRef<THREE.Mesh>(null!)
  const second = useRef<THREE.Mesh>(null!)

  const mats = useMemo(() => {
    const face = new THREE.MeshPhysicalMaterial({ map: dialTexture(), metalness: 0.4, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 })
    const edge = new THREE.MeshPhysicalMaterial({ color: '#0a1733', metalness: 0.5, roughness: 0.4 })
    const gold = new THREE.MeshPhysicalMaterial({ color: '#e7c27c', metalness: 0.75, roughness: 0.25, clearcoat: 0.6 })
    return { dial: [edge, edge, face], gold }
  }, [])

  const geo = useMemo(
    () => ({
      hour: extrudeFlat(handShape(5.6, 0.32, 1.1), 0.05, 0.01),
      minute: extrudeFlat(handShape(8.6, 0.22, 1.4), 0.05, 0.01),
      second: extrudeFlat(handShape(2.1, 0.06, 0.6), 0.04, 0.005),
      sub: extrudeFlat(ringShape(2.45, 2.38), 0.03, 0),
    }),
    [],
  )

  useFrame(() => {
    group.current.position.y = -0.7 - sim.explode * 3
    const { center, fourth } = sim.angles
    const minutes = -center / (Math.PI * 2)
    second.current.rotation.y = clock(fourth / (Math.PI * 2))
    minute.current.rotation.y = clock(minutes)
    hour.current.rotation.y = clock(minutes / 12)
  })

  return (
    <group ref={group}>
      <mesh material={mats.dial} receiveShadow>
        <cylinderGeometry args={[10.9, 10.9, 0.12, 160]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = Math.PI / 2 - (i / 12) * Math.PI * 2
        const r = 8.6
        const double = i === 0
        return (
          <group key={i} position={[Math.cos(a) * r, -0.1, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            {(double ? [-0.22, 0.22] : [0]).map((o) => (
              <mesh key={o} position={[0, 0, o]} material={mats.gold} castShadow>
                <boxGeometry args={[1.25, 0.08, double ? 0.22 : 0.3]} />
              </mesh>
            ))}
          </group>
        )
      })}
      <group position={[POS.fourth[0], -0.09, POS.fourth[1]]}>
        <mesh geometry={geo.sub} position={[0, -0.03, 0]} material={mats.gold} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 2.15, -0.02, Math.sin(a) * 2.15]} rotation={[0, -a, 0]} material={mats.gold}>
              <boxGeometry args={[i % 3 === 0 ? 0.35 : 0.18, 0.03, 0.05]} />
            </mesh>
          )
        })}
        <mesh ref={second} geometry={geo.second} position={[0, -0.16, 0]} material={mats.gold} castShadow />
        <mesh position={[0, -0.12, 0]} material={mats.gold}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
        </mesh>
      </group>
      <mesh ref={hour} geometry={geo.hour} position={[0, -0.22, 0]} material={mats.gold} castShadow />
      <mesh ref={minute} geometry={geo.minute} position={[0, -0.3, 0]} material={mats.gold} castShadow />
      <mesh position={[0, -0.3, 0]} material={mats.gold}>
        <cylinderGeometry args={[0.32, 0.32, 0.12, 32]} />
      </mesh>
    </group>
  )
}
