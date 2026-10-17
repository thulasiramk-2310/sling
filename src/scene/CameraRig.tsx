import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { input, registry } from '../core/input'
import { useStore } from '../core/store'
import { bodyById } from '../data/bodies'

const { clamp, damp } = THREE.MathUtils
const OVERVIEW_RADIUS = 78

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const rig = useRef({
    theta: 0.9,
    phi: 1.05,
    radius: 160,
    tTheta: 0.5,
    tPhi: 1.12,
    tRadius: OVERVIEW_RADIUS,
    offset: 0,
    offsetY: 0,
    target: new THREE.Vector3(),
    goal: new THREE.Vector3(),
  })

  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.selectedId === prev.selectedId) return
        const body = s.selectedId ? bodyById.get(s.selectedId) : null
        const narrow = window.innerWidth < window.innerHeight ? 1.7 : 1
        rig.current.tRadius = (body ? body.radius * (body.kind === 'star' ? 5 : 6.5) : OVERVIEW_RADIUS) * narrow
        if (!body) rig.current.tPhi = 1.12
      }),
    [],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.25)
    const st = useStore.getState()
    const r = rig.current

    if (st.phase === 'intro') r.tTheta += dt * 0.06
    r.tTheta -= input.dragDX * 2.4
    r.tPhi = clamp(r.tPhi + input.dragDY * 1.8, 0.2, 1.52)
    input.dragDX = 0
    input.dragDY = 0

    const body = st.selectedId ? bodyById.get(st.selectedId) : null
    const minR = body ? body.radius * 2.6 : 22
    const maxR = body ? body.radius * 18 : 220
    r.tRadius = clamp(r.tRadius * Math.exp(input.zoom), minR, maxR)
    input.zoom = 0

    const entry = st.selectedId ? registry.get(st.selectedId) : null
    if (entry) entry.anchor.getWorldPosition(r.goal)
    else r.goal.set(0, 0, 0)
    r.target.lerp(r.goal, 1 - Math.exp(-dt * 5))

    r.theta = damp(r.theta, r.tTheta, 4, dt)
    r.phi = damp(r.phi, r.tPhi, 4, dt)
    r.radius = damp(r.radius, r.tRadius, st.phase === 'intro' ? 0.9 : 3, dt)

    camera.position.setFromSphericalCoords(r.radius, r.phi, r.theta).add(r.target)
    camera.lookAt(r.target)

    // Shift the frame left on wide screens so the selected world isn't hidden behind the info panel.
    // On phones the panel is a bottom sheet, so shift the world up instead.
    const wide = size.width > 900
    const wantX = body && wide ? size.width * 0.17 : 0
    const wantY = body && !wide ? size.height * 0.26 : 0
    r.offset = damp(r.offset, wantX, 4, dt)
    r.offsetY = damp(r.offsetY, wantY, 4, dt)
    if (Math.abs(r.offset) > 0.5 || Math.abs(r.offsetY) > 0.5) {
      camera.setViewOffset(size.width, size.height, r.offset, r.offsetY, size.width, size.height)
    } else if (camera.view) {
      camera.clearViewOffset()
    }
  })

  return null
}
