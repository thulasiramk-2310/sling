import type { UploadSpec } from './upload'

export type Neck = 'crew' | 'collar' | 'camp' | 'polo' | 'hood' | 'stand'
export type Pattern = 'solid' | 'stripes' | 'check' | 'denim' | 'rib' | 'oxford'
export type Front = 'plain' | 'buttons' | 'zip' | 'placket'
export type Pockets = 'none' | 'chest' | 'flaps' | 'kangaroo'

export interface Variant {
  id: string
  name: string
  base: string
  accent: string
}

export interface Item {
  id: string
  name: string
  category: 'Tees' | 'Shirts' | 'Jackets' | 'Knitwear'
  price: number
  blurb: string
  fabric: string
  fit: string
  neck: Neck
  sleeves: 'short' | 'long'
  hem: number // 0..1, where the hem sits between hip line (0.5) and the texture bottom (1)
  pattern: Pattern
  front: Front
  pockets: Pockets
  variants: Variant[]
  // Retailer-uploaded pieces carry their photo and markers instead of procedural art.
  upload?: UploadSpec
}

export const catalog: Item[] = [
  {
    id: 'breton',
    name: 'Breton Stripe Tee',
    category: 'Tees',
    price: 1299,
    blurb: 'The sailor classic in heavyweight cotton jersey, with a relaxed crew neck.',
    fabric: '100% cotton jersey, 220 gsm',
    fit: 'Regular fit, true to size',
    neck: 'crew',
    sleeves: 'short',
    hem: 0.55,
    pattern: 'stripes',
    front: 'plain',
    pockets: 'none',
    variants: [
      { id: 'navy', name: 'Navy on ecru', base: '#f1ece1', accent: '#1f2b4d' },
      { id: 'red', name: 'Red on white', base: '#f7f6f2', accent: '#b8322a' },
      { id: 'black', name: 'Black on grey', base: '#c9c9c4', accent: '#1d1d1f' },
    ],
  },
  {
    id: 'oxford',
    name: 'Oxford Button-Down',
    category: 'Shirts',
    price: 2499,
    blurb: 'Soft basket-weave oxford cloth that gets better with every wash.',
    fabric: '100% cotton oxford',
    fit: 'Tailored fit, size up for room',
    neck: 'collar',
    sleeves: 'long',
    hem: 0.62,
    pattern: 'oxford',
    front: 'buttons',
    pockets: 'chest',
    variants: [
      { id: 'blue', name: 'Oxford blue', base: '#a9c1dd', accent: '#f4f6f8' },
      { id: 'white', name: 'White', base: '#f3f3ef', accent: '#e2e2dc' },
      { id: 'pink', name: 'Pale pink', base: '#e9c4c4', accent: '#f6efee' },
    ],
  },
  {
    id: 'flannel',
    name: 'Brushed Flannel Overshirt',
    category: 'Shirts',
    price: 2999,
    blurb: 'A brushed check overshirt that works as a shirt or a light layer.',
    fabric: 'Brushed cotton flannel, 260 gsm',
    fit: 'Relaxed fit',
    neck: 'collar',
    sleeves: 'long',
    hem: 0.66,
    pattern: 'check',
    front: 'buttons',
    pockets: 'flaps',
    variants: [
      { id: 'red', name: 'Buffalo red', base: '#a3262a', accent: '#1b1b1d' },
      { id: 'green', name: 'Forest', base: '#2f4a36', accent: '#0f1a14' },
      { id: 'sand', name: 'Sand', base: '#cdb48d', accent: '#6e5a3f' },
    ],
  },
  {
    id: 'trucker',
    name: 'Denim Trucker Jacket',
    category: 'Jackets',
    price: 4499,
    blurb: 'Rigid 13 oz denim with contrast stitching. It breaks in to fit you.',
    fabric: '13 oz cotton denim',
    fit: 'Boxy, cropped at the hip',
    neck: 'collar',
    sleeves: 'long',
    hem: 0.52,
    pattern: 'denim',
    front: 'buttons',
    pockets: 'flaps',
    variants: [
      { id: 'mid', name: 'Mid wash', base: '#4f6f96', accent: '#d9a24a' },
      { id: 'raw', name: 'Raw indigo', base: '#22324f', accent: '#c98d3a' },
      { id: 'black', name: 'Washed black', base: '#38393d', accent: '#9a9a9a' },
    ],
  },
  {
    id: 'hoodie',
    name: 'Loopback Fleece Hoodie',
    category: 'Knitwear',
    price: 2799,
    blurb: 'A midweight loopback hoodie with a double-layer hood and kangaroo pocket.',
    fabric: 'Organic cotton loopback, 380 gsm',
    fit: 'Relaxed fit, dropped shoulder',
    neck: 'hood',
    sleeves: 'long',
    hem: 0.6,
    pattern: 'solid',
    front: 'plain',
    pockets: 'kangaroo',
    variants: [
      { id: 'sage', name: 'Sage', base: '#8fa38a', accent: '#6d8068' },
      { id: 'oat', name: 'Oatmeal', base: '#d8ccb6', accent: '#b9ab92' },
      { id: 'charcoal', name: 'Charcoal', base: '#3e4045', accent: '#2a2b2f' },
    ],
  },
  {
    id: 'camp',
    name: 'Linen Camp Shirt',
    category: 'Shirts',
    price: 2299,
    blurb: 'An airy linen blend with an open camp collar for hot days.',
    fabric: '55% linen, 45% cotton',
    fit: 'Boxy, straight hem',
    neck: 'camp',
    sleeves: 'short',
    hem: 0.56,
    pattern: 'solid',
    front: 'buttons',
    pockets: 'chest',
    variants: [
      { id: 'sand', name: 'Sand', base: '#d9c7a2', accent: '#bfa97f' },
      { id: 'terracotta', name: 'Terracotta', base: '#b8613f', accent: '#97492c' },
      { id: 'sky', name: 'Sky', base: '#b9d3e3', accent: '#9bbbd0' },
    ],
  },
  {
    id: 'polo',
    name: 'Rib-Knit Polo',
    category: 'Knitwear',
    price: 1999,
    blurb: 'A fine rib-knit polo with a three-button placket. Smart without trying.',
    fabric: 'Cotton–modal rib knit',
    fit: 'Slim fit',
    neck: 'polo',
    sleeves: 'short',
    hem: 0.54,
    pattern: 'rib',
    front: 'placket',
    pockets: 'none',
    variants: [
      { id: 'bottle', name: 'Bottle green', base: '#244a3b', accent: '#1a3a2d' },
      { id: 'cream', name: 'Cream', base: '#ece4d2', accent: '#d7ccb5' },
      { id: 'navy', name: 'Navy', base: '#1f2b4d', accent: '#16203a' },
    ],
  },
  {
    id: 'shell',
    name: 'Technical Rain Shell',
    category: 'Jackets',
    price: 5999,
    blurb: 'A waterproof three-layer shell with taped seams and a high stand collar.',
    fabric: 'Recycled nylon, 3-layer membrane',
    fit: 'Regular fit, room for layering',
    neck: 'stand',
    sleeves: 'long',
    hem: 0.7,
    pattern: 'solid',
    front: 'zip',
    pockets: 'flaps',
    variants: [
      { id: 'black', name: 'Black', base: '#202124', accent: '#3a3b40' },
      { id: 'saffron', name: 'Saffron', base: '#e09a1f', accent: '#b97b12' },
      { id: 'olive', name: 'Olive', base: '#5d6346', accent: '#474c34' },
    ],
  },
]

export const itemById = new Map(catalog.map((i) => [i.id, i]))

export function registerItem(item: Item) {
  const i = catalog.findIndex((c) => c.id === item.id)
  if (i >= 0) catalog[i] = item
  else catalog.push(item)
  itemById.set(item.id, item)
}

export function unregisterItem(id: string) {
  const i = catalog.findIndex((c) => c.id === id)
  if (i >= 0) catalog.splice(i, 1)
  itemById.delete(id)
}

// Jackets and overshirts can be worn open over another top.
export const canLayer = (item: Item) => !item.upload && (item.category === 'Jackets' || item.id === 'flannel')
export const canBeInner = (item: Item) => !item.upload && (item.category === 'Tees' || item.category === 'Knitwear' || item.id === 'oxford') && item.neck !== 'hood'

export const formatPrice = (n: number) => `₹${n.toLocaleString('en-IN')}`

function lightness(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// Simple, explainable pairing rules: contrast the top's lightness with bottoms and shoes.
export function completeTheLook(variant: Variant): { name: string; color: string; why: string }[] {
  const l = lightness(variant.base)
  if (l > 0.68)
    return [
      { name: 'Indigo jeans', color: '#2b3a55', why: 'Dark bottoms anchor a light top' },
      { name: 'Charcoal chinos', color: '#3b3d42', why: 'Clean, high contrast' },
      { name: 'White leather sneakers', color: '#f2f2ef', why: 'Repeats the light tone' },
    ]
  if (l < 0.3)
    return [
      { name: 'Stone chinos', color: '#cbbfa8', why: 'Light bottoms balance a dark top' },
      { name: 'Light-wash denim', color: '#8fa7c4', why: 'Relaxed contrast' },
      { name: 'Tan suede boots', color: '#a77b50', why: 'Warmth against dark colors' },
    ]
  return [
    { name: 'Navy chinos', color: '#27324a', why: 'Navy works with nearly every colour' },
    { name: 'Ecru denim', color: '#e6dfcd', why: 'Soft and tonal' },
    { name: 'Brown loafers', color: '#6b4a32', why: 'Grounds a mid-tone outfit' },
  ]
}

export function similar(item: Item) {
  const close = catalog.filter((i) => i.id !== item.id && (i.category === item.category || i.pattern === item.pattern))
  const rest = catalog.filter((i) => i.id !== item.id && !close.includes(i) && i.sleeves === item.sleeves)
  return [...close, ...rest].slice(0, 3)
}
