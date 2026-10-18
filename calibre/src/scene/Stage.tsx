import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { POS, layerY, type PartId } from '../data/parts'
import { angles, sim } from '../sim'
import { useStore, type View } from '../store'
import { Movement } from './Movement'
import { Dial } from './Dial'

function Driver() {
  useFrame((_, dt) => {
    const { speed, explode } = useStore.getState()
    sim.t += Math.min(dt, 0.1) * speed
    sim.explode = THREE.MathUtils.damp(sim.explode, explode, 3, dt)
    sim.angles = angles(sim.t)
  })
  return null
}

const PRESETS: Record<View, { pos: [number, number, number]; target: [number, number, number] }> = {
  dial: { pos: [2, -42, 22], target: [0, -0.6, 0] },
  movement: { pos: [12, 40, 24], target: [0, 0.8, 0] },
  exploded: { pos: [34, 24, 34], target: [0, 4, 0] },
}

const FOCUS: Record<Exclude<PartId, 'bridges'>, { p: [number, number]; layer: number; dist: number }> = {
  barrel: { p: POS.barrel, layer: 0, dist: 16 },
  center: { p: POS.center, layer: 1, dist: 17 },
  third: { p: POS.third, layer: 2, dist: 16 },
  fourth: { p: POS.fourth, layer: 3, dist: 16 },
  escape: { p: POS.escape, layer: 4, dist: 10 },
  fork: { p: POS.fork, layer: 4.3, dist: 9 },
  balance: { p: POS.balance, layer: 5, dist: 12 },
  hairspring: { p: POS.balance, layer: 5.5, dist: 9 },
}

function Director() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; speed: number } | null>({
    pos: new THREE.Vector3(...PRESETS.dial.pos),
    target: new THREE.Vector3(...PRESETS.dial.target),
    speed: 2,
  })

  useEffect(() => {
    if (!controls) return
    const cancel = () => (goal.current = null)
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.cameraRequest === prev.cameraRequest || !controls) return
        if (s.selected && s.selected !== 'bridges') {
          const f = FOCUS[s.selected]
          const target = new THREE.Vector3(f.p[0], layerY(f.layer, s.explode), f.p[1])
          const dir = camera.position.clone().sub(controls.target).normalize()
          if (dir.y < 0.35) dir.set(0.55, 0.62, 0.56).normalize()
          const dist = f.dist * (window.innerWidth < 860 ? 1.5 : 1)
          goal.current = { pos: target.clone().addScaledVector(dir, dist), target, speed: 2.4 }
        } else {
          const preset = PRESETS[s.view === 'dial' ? 'dial' : s.view]
          const target = new THREE.Vector3(...preset.target)
          if (s.view === 'exploded') target.y = 4 * s.explode + 0.8
          goal.current = { pos: new THREE.Vector3(...preset.pos), target, speed: s.view === 'movement' && !prev.entered ? 1.1 : 2 }
        }
      }),
    [camera, controls],
  )

  const size = useThree((s) => s.size)
  const offsetY = useRef(0)
  useFrame((_, dt) => {
    // Phones show details in a bottom sheet, so lift the focused part into the free space above it.
    const cam = camera as THREE.PerspectiveCamera
    const want = size.width < 860 && useStore.getState().selected ? size.height * 0.24 : 0
    offsetY.current = THREE.MathUtils.damp(offsetY.current, want, 4, dt)
    if (offsetY.current > 0.5) cam.setViewOffset(size.width, size.height, 0, offsetY.current, size.width, size.height)
    else if (cam.view) cam.clearViewOffset()

    const g = goal.current
    if (!g || !controls) return
    const k = 1 - Math.exp(-dt * g.speed)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.05) goal.current = null
  })
  return null
}

export function Stage() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.5, far: 400, position: [5, -80, 44] }}
      onPointerMissed={() => useStore.getState().setHovered(null)}
    >
      <color attach="background" args={['#0b1120']} />
      <Driver />
      <ambientLight intensity={0.12} />
      <directionalLight
        castShadow
        position={[10, 32, 12]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, -30, 10]} intensity={1.4} color="#cfe0ff" />
      <Environment resolution={256} frames={1} environmentIntensity={1.2}>
        <Lightformer form="rect" intensity={4} position={[0, 16, 0]} rotation-x={Math.PI / 2} scale={[30, 10, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-16, 5, 6]} rotation-y={Math.PI / 2} scale={[16, 4, 1]} color="#ffe6c2" />
        <Lightformer form="rect" intensity={2} position={[16, 3, -6]} rotation-y={-Math.PI / 2} scale={[16, 3, 1]} color="#cfe0ff" />
        <Lightformer form="rect" intensity={2} position={[0, 4, 18]} scale={[28, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 4, -18]} rotation-y={Math.PI} scale={[28, 4, 1]} color="#ffeccc" />
        <Lightformer form="rect" intensity={3} position={[0, -16, 0]} rotation-x={-Math.PI / 2} scale={[30, 10, 1]} color="#e8eeff" />
        <Lightformer form="ring" intensity={2.5} position={[8, -10, 10]} rotation-x={-Math.PI / 2} scale={6} color="#ffe2b0" />
      </Environment>
      <Movement />
      <Dial />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={7} maxDistance={90} enablePan={false} />
      <Director />
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={0.5} halfRes />
        <SMAA />
        <Vignette darkness={0.55} offset={0.3} />
      </EffectComposer>
    </Canvas>
  )
}
