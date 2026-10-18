import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { input, registry } from '../core/input'
import { useStore } from '../core/store'

const ray = new THREE.Raycaster()
const ndc = new THREE.Vector2()

// Turns the unified pointer (mouse or hand) into hover, select, drag-to-rotate and DOM clicks.
export function Interaction() {
  const state = useRef({
    wasDown: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
    domHover: null as HTMLElement | null,
  }).current

  useFrame(({ camera }) => {
    const st = useStore.getState()
    if (st.phase !== 'explore') return

    if (input.back) {
      input.back = false
      st.select(null)
    }

    let hit: string | null = null
    if (input.visible && !state.dragging) {
      ray.setFromCamera(ndc.set(input.x, input.y), camera)
      const targets = Array.from(registry.values(), (r) => r.hit)
      hit = (ray.intersectObjects(targets, false)[0]?.object.userData.bodyId as string) ?? null
    }

    if (input.source === 'hand') {
      let el: HTMLElement | null = null
      if (input.visible) {
        const px = ((input.x + 1) / 2) * window.innerWidth
        const py = ((1 - input.y) / 2) * window.innerHeight
        el = (document.elementFromPoint(px, py)?.closest('[data-hand]') as HTMLElement) ?? null
      }
      if (el !== state.domHover) {
        state.domHover?.classList.remove('hand-hover')
        el?.classList.add('hand-hover')
        state.domHover = el
      }
      if (el) hit = null
    }

    if (hit !== st.hoveredId) st.setHovered(hit)

    const down = input.down && input.visible
    if (down && !state.wasDown) {
      if (state.domHover) state.domHover.click()
      else if (hit) st.select(hit)
      else {
        state.dragging = true
        state.lastX = input.x
        state.lastY = input.y
      }
    }
    if (down && state.dragging) {
      input.dragDX += input.x - state.lastX
      input.dragDY += input.y - state.lastY
      state.lastX = input.x
      state.lastY = input.y
    }
    if (!down) state.dragging = false
    state.wasDown = down
  })

  return null
}
