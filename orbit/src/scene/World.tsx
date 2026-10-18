import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { bodies } from '../data/bodies'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { Planet } from './Planet'
import { Sun } from './Sun'
import { CameraRig } from './CameraRig'
import { Interaction } from './Interaction'
import { AsteroidBelt } from './Extras'

function SimClock() {
  useFrame((_, dt) => {
    const { speed, selectedId } = useStore.getState()
    input.simTime += Math.min(dt, 0.05) * speed * (selectedId ? 0.12 : 1)
  })
  return null
}

export function World() {
  return (
    <Canvas
      camera={{ fov: 42, near: 0.1, far: 3000, position: [0, 60, 150] }}
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#020308']} />
      <Stars radius={500} depth={120} count={7000} factor={7} saturation={0.15} fade speed={0.4} />
      {bodies.map((b) => (b.kind === 'star' ? <Sun key={b.id} body={b} /> : <Planet key={b.id} body={b} />))}
      <AsteroidBelt />
      <SimClock />
      <CameraRig />
      <Interaction />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.75} />
        <Vignette darkness={0.65} offset={0.25} />
        <Noise opacity={0.035} />
      </EffectComposer>
    </Canvas>
  )
}
