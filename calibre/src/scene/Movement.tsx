import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { FORK_DIRECTION, MODULE, POS, layerY, meshAngle, type PartId } from '../data/parts'
import { sim, type Angles } from '../sim'
import { useStore } from '../store'
import {
  cotesTexture,
  escapeShape,
  extrudeFlat,
  forkShape,
  gearShape,
  hullShape,
  perlageTexture,
  ringShape,
  spiralGeometry,
  writeSpiral,
} from './geometry'
import { makeBlued, makeGilt, makeRhodium, makeRuby, makeSteel, usePartLook } from './materials'

type P = [number, number]

function Selectable({ id, children }: { id: PartId; children: ReactNode }) {
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    useStore.getState().setHovered(id)
  }
  const onOut = () => {
    if (useStore.getState().hovered === id) useStore.getState().setHovered(null)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 6) return
    const s = useStore.getState()
    s.select(s.selected === id ? null : id)
  }
  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      {children}
    </group>
  )
}

interface GearSpec {
  teeth: number
  layer: number
  phase: number
  spokes?: number
}

function Arbor({
  id,
  pos,
  angle,
  wheel,
  pinion,
}: {
  id: PartId
  pos: P
  angle: keyof Angles
  wheel: GearSpec
  pinion?: GearSpec
}) {
  const wheelRef = useRef<THREE.Mesh>(null!)
  const pinionRef = useRef<THREE.Mesh>(null)
  const staff = useRef<THREE.Mesh>(null!)
  const mats = useMemo(() => [makeGilt(), makeSteel()], [])
  usePartLook(id, mats)
  const geo = useMemo(
    () => ({
      wheel: extrudeFlat(gearShape(wheel.teeth, MODULE, { spokes: wheel.spokes ?? 5 }), 0.12),
      pinion: pinion ? extrudeFlat(gearShape(pinion.teeth, MODULE, { pinion: true, bore: 0.04 }), 0.3, 0.006) : null,
    }),
    [wheel, pinion],
  )

  useFrame(() => {
    const a = sim.angles[angle]
    const e = sim.explode
    const yw = layerY(wheel.layer, e)
    wheelRef.current.position.y = yw
    wheelRef.current.rotation.y = -(a + wheel.phase)
    let lo = yw
    let hi = yw
    if (pinion && pinionRef.current) {
      const yp = layerY(pinion.layer, e) - 0.09
      pinionRef.current.position.y = yp
      pinionRef.current.rotation.y = -(a + pinion.phase)
      lo = Math.min(lo, yp)
      hi = Math.max(hi, yp)
    }
    lo -= 0.35
    hi += 0.55
    staff.current.position.y = (lo + hi) / 2
    staff.current.scale.y = hi - lo
  })

  return (
    <Selectable id={id}>
      <group position={[pos[0], 0, pos[1]]}>
        <mesh ref={wheelRef} geometry={geo.wheel} material={mats[0]} castShadow receiveShadow />
        {geo.pinion && <mesh ref={pinionRef} geometry={geo.pinion} material={mats[1]} castShadow />}
        <mesh ref={staff} material={mats[1]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 1, 20]} />
        </mesh>
      </group>
    </Selectable>
  )
}

function Barrel({ phase }: { phase: number }) {
  const group = useRef<THREE.Group>(null!)
  const mats = useMemo(() => [makeGilt(), makeSteel(), makeRhodium()], [])
  usePartLook('barrel', mats)
  const geo = useMemo(
    () => ({
      wheel: extrudeFlat(gearShape(72, MODULE, { spokes: 0, bore: 0.2 }), 0.12),
      spring: spiralGeometry(0.55, 3.0, 9, 0.05, 1200),
    }),
    [],
  )
  useFrame(() => {
    group.current.position.y = layerY(0, sim.explode)
    group.current.rotation.y = -(sim.angles.barrel + phase)
  })
  return (
    <Selectable id="barrel">
      <group position={[POS.barrel[0], 0, POS.barrel[1]]}>
        <group ref={group}>
          <mesh geometry={geo.wheel} material={mats[0]} castShadow receiveShadow />
          <mesh position={[0, 0.34, 0]} material={mats[2]} castShadow receiveShadow>
            <cylinderGeometry args={[3.28, 3.28, 0.5, 96, 1, true]} />
          </mesh>
          <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats[2]} receiveShadow>
            <circleGeometry args={[3.28, 96]} />
          </mesh>
          <mesh geometry={geo.spring} position={[0, 0.3, 0]}>
            <meshPhysicalMaterial attach="material" color="#c9ced6" metalness={1} roughness={0.25} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={mats[1]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.62, 32]} />
          </mesh>
        </group>
      </group>
    </Selectable>
  )
}

function EscapeWheel({ pinionPhase }: { pinionPhase: number }) {
  const wheel = useRef<THREE.Mesh>(null!)
  const pinion = useRef<THREE.Mesh>(null!)
  const staff = useRef<THREE.Mesh>(null!)
  const mats = useMemo(() => [makeSteel(), makeSteel()], [])
  usePartLook('escape', mats)
  const geo = useMemo(
    () => ({
      wheel: extrudeFlat(escapeShape(15, 1.5), 0.1, 0.008),
      pinion: extrudeFlat(gearShape(5, MODULE, { pinion: true, bore: 0.03 }), 0.3, 0.005),
    }),
    [],
  )
  useFrame(() => {
    const e = sim.explode
    const a = sim.angles.escape
    const yw = layerY(4, e)
    const yp = layerY(3, e) - 0.09
    wheel.current.position.y = yw
    wheel.current.rotation.y = -a
    pinion.current.position.y = yp
    pinion.current.rotation.y = -(a + pinionPhase)
    staff.current.position.y = (yp - 0.3 + yw + 0.5) / 2
    staff.current.scale.y = yw + 0.5 - (yp - 0.3)
  })
  return (
    <Selectable id="escape">
      <group position={[POS.escape[0], 0, POS.escape[1]]}>
        <mesh ref={wheel} geometry={geo.wheel} material={mats[0]} castShadow receiveShadow />
        <mesh ref={pinion} geometry={geo.pinion} material={mats[1]} castShadow />
        <mesh ref={staff} material={mats[1]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        </mesh>
      </group>
    </Selectable>
  )
}

function PalletFork() {
  const group = useRef<THREE.Group>(null!)
  const mats = useMemo(() => [makeSteel(), makeRuby()], [])
  usePartLook('fork', mats)
  const geo = useMemo(() => extrudeFlat(forkShape(), 0.09, 0.008), [])
  useFrame(() => {
    group.current.position.y = layerY(4, sim.explode) + 0.16 + sim.explode * 0.6
    group.current.rotation.y = -(FORK_DIRECTION + sim.angles.fork)
  })
  return (
    <Selectable id="fork">
      <group position={[POS.fork[0], 0, POS.fork[1]]}>
        <group ref={group}>
          <mesh geometry={geo} material={mats[0]} castShadow receiveShadow />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[-0.84, -0.06, s * 0.78]} rotation={[0, s * 0.35, 0]} material={mats[1]} castShadow>
              <boxGeometry args={[0.24, 0.26, 0.1]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0]} material={mats[0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
          </mesh>
        </group>
      </group>
    </Selectable>
  )
}

function Balance() {
  const group = useRef<THREE.Group>(null!)
  const mats = useMemo(() => [makeGilt(), makeSteel(), makeRuby()], [])
  usePartLook('balance', mats)
  const rim = useMemo(() => extrudeFlat(ringShape(2.4, 2.18), 0.2, 0.015), [])
  const pinAngle = FORK_DIRECTION + Math.PI
  useFrame(() => {
    group.current.position.y = layerY(5, sim.explode)
    group.current.rotation.y = -sim.angles.balance
  })
  return (
    <Selectable id="balance">
      <group position={[POS.balance[0], 0, POS.balance[1]]}>
        <group ref={group}>
          <mesh geometry={rim} material={mats[0]} castShadow receiveShadow />
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, (-i * Math.PI * 2) / 3, 0]} position={[0, 0.1, 0]} material={mats[0]} castShadow>
              <boxGeometry args={[4.4, 0.12, 0.16]} />
            </mesh>
          ))}
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 2.47, 0.1, Math.sin(a) * 2.47]}
                rotation={[0, -a, Math.PI / 2]}
                material={mats[0]}
                castShadow
              >
                <cylinderGeometry args={[0.07, 0.07, 0.18, 12]} />
              </mesh>
            )
          })}
          <mesh position={[0, 0.1, 0]} material={mats[1]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 1.4, 16]} />
          </mesh>
          <mesh position={[0, -0.22, 0]} material={mats[1]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.08, 32]} />
          </mesh>
          <mesh position={[Math.cos(pinAngle) * 0.32, -0.3, Math.sin(pinAngle) * 0.32]} material={mats[2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.18, 12]} />
          </mesh>
        </group>
      </group>
    </Selectable>
  )
}

function Hairspring() {
  const group = useRef<THREE.Group>(null!)
  const mats = useMemo(() => {
    const spring = makeBlued()
    spring.side = THREE.DoubleSide
    return [spring, makeSteel()]
  }, [])
  usePartLook('hairspring', mats)
  const geo = useMemo(() => spiralGeometry(0.3, 1.75, 13, 0.035, 1400), [])
  useFrame(() => {
    group.current.position.y = layerY(5, sim.explode) + 0.32 + sim.explode * 0.9
    writeSpiral(geo, 0.3, 1.75, 13, 0.035, -sim.angles.balance)
  })
  return (
    <Selectable id="hairspring">
      <group position={[POS.balance[0], 0, POS.balance[1]]}>
        <group ref={group}>
          <mesh geometry={geo} material={mats[0]} />
          <mesh material={mats[1]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 24]} />
          </mesh>
        </group>
      </group>
    </Selectable>
  )
}

const polar = (o: P, d: number, deg: number): P => [o[0] + d * Math.cos((deg * Math.PI) / 180), o[1] + d * Math.sin((deg * Math.PI) / 180)]

function Bridges() {
  const top = useRef<THREE.Group>(null!)
  const plate = useRef<THREE.Group>(null!)
  const bridgeMeshes = useRef<THREE.Mesh[]>([])
  const bridgeMat = useMemo(() => {
    const m = makeRhodium()
    const tex = cotesTexture()
    tex.repeat.set(0.12, 0.12)
    m.map = tex
    m.roughness = 0.3
    m.transparent = true
    return m
  }, [])
  const plateMats = useMemo(() => {
    const side = makeRhodium()
    const face = makeRhodium()
    const tex = perlageTexture()
    tex.repeat.set(5, 5)
    face.map = tex
    face.roughness = 0.42
    return [side, face, face]
  }, [])
  const blued = useMemo(() => makeBlued(), [])
  const ruby = useMemo(() => makeRuby(), [])
  const gilt = useMemo(() => makeGilt(), [])
  const allMats = useMemo(() => [bridgeMat, ...plateMats.slice(0, 2), blued, ruby, gilt], [bridgeMat, plateMats, blued, ruby, gilt])
  usePartLook('bridges', allMats)

  const outward = Math.atan2(POS.balance[1], POS.balance[0]) * (180 / Math.PI)
  const pieces = useMemo(() => {
    const c = (p: P, r: number) => ({ x: p[0], y: p[1], r })
    return [
      { y: 1.5, depth: 0.34, geo: extrudeFlat(hullShape([c(POS.barrel, 3.7)]), 0.34, 0.03) },
      {
        y: 1.52,
        depth: 0.3,
        geo: extrudeFlat(
          hullShape([c(POS.center, 1.25), c(POS.third, 1.15), c(POS.fourth, 1.2), c(POS.escape, 0.95)]),
          0.3,
          0.03,
        ),
      },
      { y: 1.62, depth: 0.24, geo: extrudeFlat(hullShape([c(POS.fork, 0.6), c(polar(POS.fork, 1.0, 20), 0.45)]), 0.24, 0.025) },
      {
        y: 2.08,
        depth: 0.26,
        geo: extrudeFlat(hullShape([c(POS.balance, 0.85), c(polar(POS.balance, 3.3, outward), 1.35)]), 0.26, 0.03),
      },
    ]
  }, [outward])

  const jewels: { p: P; y: number }[] = [
    { p: POS.barrel, y: 1.84 },
    { p: POS.center, y: 1.82 },
    { p: POS.third, y: 1.82 },
    { p: POS.fourth, y: 1.82 },
    { p: POS.escape, y: 1.82 },
    { p: POS.fork, y: 1.86 },
    { p: POS.balance, y: 2.34 },
  ]
  const screws: { p: P; y: number }[] = [
    { p: polar(POS.barrel, 2.9, 110), y: 1.84 },
    { p: polar(POS.barrel, 2.9, 300), y: 1.84 },
    { p: polar(POS.third, 0.85, -80), y: 1.82 },
    { p: polar(POS.fourth, 0.85, 15), y: 1.82 },
    { p: polar(POS.balance, 3.6, outward), y: 2.34 },
    { p: polar(POS.fork, 1.0, 20), y: 1.86 },
  ]

  useFrame(() => {
    const e = sim.explode
    top.current.position.y = e * 8.5
    plate.current.position.y = -e * 1.6
    const opacity = THREE.MathUtils.clamp(1 - e * 1.6, 0.14, 1)
    bridgeMat.opacity = opacity
    bridgeMat.depthWrite = opacity > 0.95
    // Faded bridges must not keep shading the wheels underneath.
    for (const m of bridgeMeshes.current) m.castShadow = opacity > 0.6
  })

  return (
    <Selectable id="bridges">
      <group ref={plate}>
        <mesh position={[0, -0.47, 0]} material={plateMats} receiveShadow>
          <cylinderGeometry args={[10.8, 10.8, 0.3, 128]} />
        </mesh>
      </group>
      <group ref={top}>
        {pieces.map((b, i) => (
          <mesh
            key={i}
            ref={(m) => {
              if (m) bridgeMeshes.current[i] = m
            }}
            geometry={b.geo}
            position={[0, b.y, 0]}
            material={bridgeMat}
            castShadow
            receiveShadow
          />
        ))}
        {jewels.map((j, i) => (
          <group key={i} position={[j.p[0], j.y, j.p[1]]}>
            <mesh material={gilt}>
              <torusGeometry args={[0.24, 0.05, 12, 32]} />
            </mesh>
            <mesh material={ruby} position={[0, 0.01, 0]}>
              <cylinderGeometry args={[0.17, 0.19, 0.06, 32]} />
            </mesh>
          </group>
        ))}
        {screws.map((s, i) => (
          <group key={i} position={[s.p[0], s.y, s.p[1]]} rotation={[0, i * 0.9, 0]}>
            <mesh material={blued} castShadow>
              <cylinderGeometry args={[0.24, 0.26, 0.09, 32]} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.46, 0.04, 0.06]} />
              <meshStandardMaterial color="#0b1430" />
            </mesh>
          </group>
        ))}
      </group>
    </Selectable>
  )
}

function Case() {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#d4d8de', metalness: 0.9, roughness: 0.18, clearcoat: 0.5 }), [])
  const profile = useMemo(() => {
    const pts: [number, number][] = [
      [11.05, -1.5],
      [11.9, -1.5],
      [12.35, -1.15],
      [12.55, -0.4],
      [12.55, 1.4],
      [12.3, 2.3],
      [11.8, 2.65],
      [11.05, 2.65],
    ]
    return new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      160,
    )
  }, [])
  return (
    <group>
      <mesh geometry={profile} material={mat} castShadow receiveShadow />
      <mesh position={[13.0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={mat} castShadow>
        <cylinderGeometry args={[0.85, 0.85, 1.1, 36]} />
      </mesh>
      <mesh position={[12.55, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={mat}>
        <cylinderGeometry args={[0.35, 0.35, 0.6, 20]} />
      </mesh>
    </group>
  )
}

export function Movement() {
  const ph = useMemo(() => {
    const bc = meshAngle(POS.barrel, POS.center)
    const ct = meshAngle(POS.center, POS.third)
    const tf = meshAngle(POS.third, POS.fourth)
    const fe = meshAngle(POS.fourth, POS.escape)
    return {
      barrel: bc,
      center: { wheel: ct, pinion: bc + Math.PI - Math.PI / 12 },
      third: { wheel: tf, pinion: ct + Math.PI - Math.PI / 10 },
      fourth: { wheel: fe, pinion: tf + Math.PI - Math.PI / 10 },
      escapePinion: fe + Math.PI - Math.PI / 5,
    }
  }, [])

  const specs = useMemo(
    () => ({
      center: { wheel: { teeth: 80, layer: 1, phase: ph.center.wheel }, pinion: { teeth: 12, layer: 0, phase: ph.center.pinion } },
      third: { wheel: { teeth: 75, layer: 2, phase: ph.third.wheel }, pinion: { teeth: 10, layer: 1, phase: ph.third.pinion } },
      fourth: { wheel: { teeth: 80, layer: 3, phase: ph.fourth.wheel }, pinion: { teeth: 10, layer: 2, phase: ph.fourth.pinion } },
    }),
    [ph],
  )

  return (
    <group>
      <Case />
      <Bridges />
      <Barrel phase={ph.barrel} />
      <Arbor id="center" pos={POS.center} angle="center" {...specs.center} />
      <Arbor id="third" pos={POS.third} angle="third" {...specs.third} />
      <Arbor id="fourth" pos={POS.fourth} angle="fourth" {...specs.fourth} />
      <EscapeWheel pinionPhase={ph.escapePinion} />
      <PalletFork />
      <Balance />
      <Hairspring />
    </group>
  )
}
