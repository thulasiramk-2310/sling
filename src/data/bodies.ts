export type BodyKind = 'star' | 'rocky' | 'earth' | 'gas' | 'ice'

export interface Stat {
  label: string
  value: number
  unit: string
  decimals?: number
}

export interface Body {
  id: string
  name: string
  tagline: string
  kind: BodyKind
  radius: number
  orbit: number
  periodYears: number
  phase: number
  spin: number
  tilt: number
  colors: [string, string, string]
  atmosphere: string
  rings?: boolean
  stats: Stat[]
  fact: string
}

export const bodies: Body[] = [
  {
    id: 'sun',
    name: 'Sun',
    tagline: 'The star that holds it all together',
    kind: 'star',
    radius: 3.2,
    orbit: 0,
    periodYears: 1,
    phase: 0,
    spin: 0.05,
    tilt: 0,
    colors: ['#ff5a0a', '#ffb347', '#fff1c1'],
    atmosphere: '#ff9a3c',
    stats: [
      { label: 'Diameter', value: 1392700, unit: 'km' },
      { label: 'Surface', value: 5500, unit: '°C' },
      { label: 'Age', value: 4.6, unit: 'bn yrs', decimals: 1 },
      { label: 'Mass', value: 333000, unit: 'Earths' },
    ],
    fact: 'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    tagline: 'Small, swift and scorched',
    kind: 'rocky',
    radius: 0.42,
    orbit: 7.5,
    periodYears: 0.24,
    phase: 0.4,
    spin: 0.1,
    tilt: 0.0006,
    colors: ['#5d5853', '#8f8780', '#c2bbb3'],
    atmosphere: '#a9a29b',
    stats: [
      { label: 'Diameter', value: 4879, unit: 'km' },
      { label: 'Day', value: 58.6, unit: 'Earth days', decimals: 1 },
      { label: 'Year', value: 88, unit: 'days' },
      { label: 'Moons', value: 0, unit: '' },
      { label: 'Mean temp', value: 167, unit: '°C' },
    ],
    fact: 'A full day on Mercury, sunrise to sunrise, lasts longer than its year.',
  },
  {
    id: 'venus',
    name: 'Venus',
    tagline: 'A runaway greenhouse wrapped in cloud',
    kind: 'rocky',
    radius: 0.72,
    orbit: 10.5,
    periodYears: 0.62,
    phase: 2.1,
    spin: -0.05,
    tilt: 3.09,
    colors: ['#b5762f', '#e3b46b', '#f6dfae'],
    atmosphere: '#ffd59a',
    stats: [
      { label: 'Diameter', value: 12104, unit: 'km' },
      { label: 'Day', value: 243, unit: 'Earth days' },
      { label: 'Year', value: 225, unit: 'days' },
      { label: 'Moons', value: 0, unit: '' },
      { label: 'Mean temp', value: 464, unit: '°C' },
    ],
    fact: 'Venus spins backwards, so the Sun rises in the west.',
  },
  {
    id: 'earth',
    name: 'Earth',
    tagline: 'The pale blue dot we call home',
    kind: 'earth',
    radius: 0.76,
    orbit: 14,
    periodYears: 1,
    phase: 4.2,
    spin: 0.6,
    tilt: 0.41,
    colors: ['#1d4e89', '#3f7a3a', '#a68a5b'],
    atmosphere: '#5fb4ff',
    stats: [
      { label: 'Diameter', value: 12742, unit: 'km' },
      { label: 'Day', value: 23.9, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 365.25, unit: 'days', decimals: 2 },
      { label: 'Moons', value: 1, unit: '' },
      { label: 'Mean temp', value: 15, unit: '°C' },
    ],
    fact: 'The only world we know with liquid water on its surface, and life.',
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'A cold desert with the tallest volcano known',
    kind: 'rocky',
    radius: 0.55,
    orbit: 18,
    periodYears: 1.88,
    phase: 1.1,
    spin: 0.58,
    tilt: 0.44,
    colors: ['#6e2a12', '#b4532a', '#e09b6b'],
    atmosphere: '#ff9b6b',
    stats: [
      { label: 'Diameter', value: 6779, unit: 'km' },
      { label: 'Day', value: 24.6, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 687, unit: 'days' },
      { label: 'Moons', value: 2, unit: '' },
      { label: 'Mean temp', value: -65, unit: '°C' },
    ],
    fact: 'Olympus Mons rises about two and a half times higher than Everest.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    tagline: 'King of the planets',
    kind: 'gas',
    radius: 2.1,
    orbit: 26,
    periodYears: 11.86,
    phase: 5.3,
    spin: 1.4,
    tilt: 0.05,
    colors: ['#8a5a3b', '#e5c9a3', '#c2703d'],
    atmosphere: '#f0d2a8',
    stats: [
      { label: 'Diameter', value: 139820, unit: 'km' },
      { label: 'Day', value: 9.9, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 11.9, unit: 'Earth yrs', decimals: 1 },
      { label: 'Moons', value: 95, unit: '' },
      { label: 'Mean temp', value: -110, unit: '°C' },
    ],
    fact: 'Its Great Red Spot is a storm wider than Earth that has raged for centuries.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    tagline: 'Jewel of the solar system',
    kind: 'gas',
    radius: 1.75,
    orbit: 34,
    periodYears: 29.46,
    phase: 3.0,
    spin: 1.3,
    tilt: 0.47,
    colors: ['#9c7d4f', '#ead7a4', '#c9a66b'],
    atmosphere: '#f3dfae',
    rings: true,
    stats: [
      { label: 'Diameter', value: 116460, unit: 'km' },
      { label: 'Day', value: 10.7, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 29.4, unit: 'Earth yrs', decimals: 1 },
      { label: 'Moons', value: 274, unit: '' },
      { label: 'Mean temp', value: -140, unit: '°C' },
    ],
    fact: 'Its rings stretch about 280,000 km across, yet are often only about 10 meters thick.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    tagline: 'The planet that rolls on its side',
    kind: 'ice',
    radius: 1.2,
    orbit: 41,
    periodYears: 84,
    phase: 0.8,
    spin: -0.9,
    tilt: 1.71,
    colors: ['#7fc6cf', '#b4ecef', '#5aa6b3'],
    atmosphere: '#a5f2ff',
    stats: [
      { label: 'Diameter', value: 50724, unit: 'km' },
      { label: 'Day', value: 17.2, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 84, unit: 'Earth yrs' },
      { label: 'Moons', value: 29, unit: '' },
      { label: 'Mean temp', value: -195, unit: '°C' },
    ],
    fact: 'Tilted about 98°, Uranus rolls around the Sun like a ball.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    tagline: 'Dark, cold and whipped by supersonic winds',
    kind: 'ice',
    radius: 1.15,
    orbit: 47,
    periodYears: 164.8,
    phase: 2.6,
    spin: 0.95,
    tilt: 0.49,
    colors: ['#1f3f9a', '#4d7be0', '#8fb4ff'],
    atmosphere: '#6f9bff',
    stats: [
      { label: 'Diameter', value: 49244, unit: 'km' },
      { label: 'Day', value: 16.1, unit: 'hours', decimals: 1 },
      { label: 'Year', value: 164.8, unit: 'Earth yrs', decimals: 1 },
      { label: 'Moons', value: 16, unit: '' },
      { label: 'Mean temp', value: -200, unit: '°C' },
    ],
    fact: 'Winds here reach about 2,000 km/h, the fastest in the solar system.',
  },
]

export const bodyById = new Map(bodies.map((b) => [b.id, b]))

export function orbitAngle(body: Body, simTime: number) {
  return body.phase + (simTime * Math.PI * 2) / (Math.pow(body.periodYears, 0.55) * 40)
}
