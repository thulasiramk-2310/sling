export type PartId =
  | 'barrel'
  | 'center'
  | 'third'
  | 'fourth'
  | 'escape'
  | 'fork'
  | 'balance'
  | 'hairspring'
  | 'bridges'

export interface Part {
  id: PartId
  name: string
  role: string
  description: string
  specs: [string, string][]
}

// Listed in the order power flows through the movement.
export const parts: Part[] = [
  {
    id: 'barrel',
    name: 'Mainspring barrel',
    role: 'Stores the energy',
    description:
      'A coiled steel mainspring lives inside this toothed drum. As the spring slowly unwinds it turns the barrel, which drives the whole gear train.',
    specs: [
      ['Teeth', '72'],
      ['Speed', '1 turn / 6 h'],
      ['Power reserve', '≈ 42 h'],
      ['Drives', 'Center pinion · 12'],
    ],
  },
  {
    id: 'center',
    name: 'Center wheel',
    role: 'Turns once an hour',
    description:
      'Sitting at the heart of the movement, the center wheel makes exactly one turn per hour. Its arbor comes through the dial and carries the minute hand.',
    specs: [
      ['Teeth', '80'],
      ['Pinion', '12 leaves'],
      ['Speed', '1 turn / h'],
      ['Carries', 'Minute hand'],
    ],
  },
  {
    id: 'third',
    name: 'Third wheel',
    role: 'Steps up the speed',
    description:
      'An intermediate wheel that multiplies speed by eight between the center wheel and the fourth wheel, while keeping the train compact.',
    specs: [
      ['Teeth', '75'],
      ['Pinion', '10 leaves'],
      ['Speed', '1 turn / 7.5 min'],
      ['Ratio in', '80 : 10'],
    ],
  },
  {
    id: 'fourth',
    name: 'Fourth wheel',
    role: 'Turns once a minute',
    description:
      'The fourth wheel completes one revolution every 60 seconds, so its arbor carries the small seconds hand on the dial side.',
    specs: [
      ['Teeth', '80'],
      ['Pinion', '10 leaves'],
      ['Speed', '1 turn / min'],
      ['Carries', 'Seconds hand'],
    ],
  },
  {
    id: 'escape',
    name: 'Escape wheel',
    role: 'Releases power in steps',
    description:
      'Its 15 club-shaped teeth are held and released by the pallet fork. Every tick lets it jump forward by half a tooth, which is why the seconds hand moves in tiny steps.',
    specs: [
      ['Teeth', '15 club teeth'],
      ['Pinion', '5 leaves'],
      ['Speed', '16 turns / min'],
      ['Steps', '8 per second'],
    ],
  },
  {
    id: 'fork',
    name: 'Pallet fork',
    role: 'Locks, unlocks, pushes',
    description:
      'Two synthetic ruby pallet stones alternately lock the escape wheel and let it go. Each release gives the balance a small push, keeping it swinging.',
    specs: [
      ['Pallet stones', '2 rubies'],
      ['Swing', '≈ ±7°'],
      ['Actions', '8 per second'],
      ['Type', 'Swiss lever'],
    ],
  },
  {
    id: 'balance',
    name: 'Balance wheel',
    role: 'Keeps the time',
    description:
      'The heartbeat of the watch. It swings back and forth four times every second; each swing lets the gear train advance by one precise step.',
    specs: [
      ['Frequency', '4 Hz'],
      ['Beat', '28,800 vph'],
      ['Amplitude', '≈ 280°'],
      ['Timing screws', '18'],
    ],
  },
  {
    id: 'hairspring',
    name: 'Hairspring',
    role: 'Sets the rhythm',
    description:
      'A spring thinner than a human hair. It pulls the balance back toward center after every swing, and its length sets how fast the watch runs.',
    specs: [
      ['Coils', '13'],
      ['Material', 'Blued steel'],
      ['Breathes', '8 times / s'],
      ['Adjusts', 'Rate ± s/day'],
    ],
  },
  {
    id: 'bridges',
    name: 'Bridges & mainplate',
    role: 'Hold everything in place',
    description:
      'Rhodium-plated bridges hold each arbor between two jewel bearings. They are decorated with Côtes de Genève stripes, and the mainplate below with perlage circles.',
    specs: [
      ['Jewels', '21'],
      ['Bridges', 'Côtes de Genève'],
      ['Mainplate', 'Perlage'],
      ['Screws', 'Blued steel'],
    ],
  },
]

export const partById = new Map(parts.map((p) => [p.id, p]))

// Layout in the movement's plane, in millimetre-like units (x, z). Center distances
// follow from the tooth counts: (z1 + z2) * module / 2 with module 0.1.
export const MODULE = 0.1
type P = [number, number]
const polar = (o: P, dist: number, deg: number): P => [
  o[0] + dist * Math.cos((deg * Math.PI) / 180),
  o[1] + dist * Math.sin((deg * Math.PI) / 180),
]

export const POS = {} as Record<'center' | 'barrel' | 'third' | 'fourth' | 'escape' | 'fork' | 'balance', P>
POS.center = [0, 0]
POS.barrel = polar(POS.center, 4.2, 215)
POS.third = polar(POS.center, 4.5, -30)
POS.fourth = polar(POS.third, 4.25, 70)
POS.escape = polar(POS.fourth, 4.25, 160)
POS.fork = polar(POS.escape, 2.0, 110)
POS.balance = polar(POS.fork, 2.4, 110)

export const FORK_DIRECTION = (110 * Math.PI) / 180

// Assembled height of each layer; explode spreads them apart.
export const LAYER_GAP = 0.32
export const EXPLODE_GAP = 1.6
export const layerY = (layer: number, explode: number) => layer * LAYER_GAP + layer * explode * EXPLODE_GAP

export function meshAngle(from: P, to: P) {
  return Math.atan2(to[1] - from[1], to[0] - from[0])
}
