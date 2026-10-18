import { create } from 'zustand'
import type { PartId } from './data/parts'

export type View = 'movement' | 'dial' | 'exploded'

interface State {
  entered: boolean
  selected: PartId | null
  hovered: PartId | null
  explode: number
  speed: number
  view: View
  touring: boolean
  cameraRequest: number
  enter: () => void
  select: (id: PartId | null, fromTour?: boolean) => void
  setHovered: (id: PartId | null) => void
  setExplode: (v: number) => void
  setSpeed: (v: number) => void
  setView: (v: View) => void
  setTouring: (v: boolean) => void
}

export const useStore = create<State>((set, get) => ({
  entered: false,
  selected: null,
  hovered: null,
  explode: 0,
  speed: 1,
  view: 'dial',
  touring: false,
  cameraRequest: 0,
  enter: () => set({ entered: true, view: 'movement', cameraRequest: get().cameraRequest + 1 }),
  select: (id, fromTour = false) => {
    const s = get()
    const needsOpen = id && id !== 'bridges' && s.explode < 0.55
    set({
      selected: id,
      touring: fromTour ? s.touring : false,
      explode: needsOpen ? 0.55 : s.explode,
      view: id ? (needsOpen || s.view === 'dial' ? 'exploded' : s.view) : s.view,
      cameraRequest: s.cameraRequest + 1,
    })
  },
  setHovered: (hovered) => set({ hovered }),
  setExplode: (explode) => set({ explode }),
  setSpeed: (speed) => set({ speed }),
  setView: (view) =>
    set((s) => ({
      view,
      selected: view === 'dial' ? null : s.selected,
      explode: view === 'exploded' ? Math.max(s.explode, 0.7) : view === 'movement' ? 0 : s.explode,
      cameraRequest: s.cameraRequest + 1,
    })),
  setTouring: (touring) => set({ touring }),
}))
