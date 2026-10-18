import type { Item } from './catalog'

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type Size = (typeof SIZES)[number]

// Body chest girth (cm) each size is cut for, unisex tops.
export const SIZE_CHART: Record<Size, [number, number]> = {
  XS: [82, 88],
  S: [88, 94],
  M: [94, 100],
  L: [100, 106],
  XL: [106, 112],
  XXL: [112, 120],
}

export interface Profile {
  heightCm: number
  weightKg: number
  fit: 'snug' | 'regular' | 'roomy'
}

export interface SizeAdvice {
  size: Size
  confidence: 'good' | 'between'
  alternative: Size | null
  chestCm: number
  reasons: string[]
}

// A deliberately simple, explainable estimate: chest girth grows with weight and, a little, with height.
export function estimateChest(p: Profile) {
  return 52 + 0.62 * p.weightKg + 0.1 * (p.heightCm - 170)
}

// Shoulder width relative to torso length, measured by the camera, nudges the estimate for build.
export function buildAdjustment(shoulderToTorso: number | null) {
  if (shoulderToTorso === null) return 0
  return Math.max(-4, Math.min(4, (shoulderToTorso - 0.85) * 30))
}

const ITEM_FIT: Record<string, number> = { slim: 1.5, regular: 0, relaxed: -1.5, boxy: -2 }

export function itemFitType(item: Item): keyof typeof ITEM_FIT {
  const f = item.fit.toLowerCase()
  if (f.includes('slim') || f.includes('tailored')) return 'slim'
  if (f.includes('boxy')) return 'boxy'
  if (f.includes('relaxed')) return 'relaxed'
  return 'regular'
}

export function recommendSize(item: Item, p: Profile, shoulderToTorso: number | null = null): SizeAdvice {
  const chest = estimateChest(p)
  const build = buildAdjustment(shoulderToTorso)
  const pref = p.fit === 'snug' ? -2 : p.fit === 'roomy' ? 3 : 0
  const fitType = itemFitType(item)
  const target = chest + build + pref + ITEM_FIT[fitType]

  let size: Size = SIZES[0]
  for (const s of SIZES) if (target >= SIZE_CHART[s][0]) size = s
  const [lo, hi] = SIZE_CHART[size]
  const edge = Math.min(target - lo, hi - target)
  const i = SIZES.indexOf(size)
  const alternative = edge < 1.2 ? (target - lo < hi - target ? SIZES[i - 1] ?? null : SIZES[i + 1] ?? null) : null

  const reasons = [`Estimated chest about ${Math.round(chest + build)} cm from your height and weight`]
  if (build) reasons.push(`Camera check: ${build > 0 ? 'broader' : 'narrower'} shoulders than average (${build > 0 ? '+' : ''}${build.toFixed(1)} cm)`)
  if (fitType !== 'regular') reasons.push(fitType === 'slim' ? 'This piece runs slim, so we lean a size up' : `This piece is cut ${fitType}, so it has extra room`)
  if (pref) reasons.push(p.fit === 'snug' ? 'You prefer a closer fit' : 'You prefer a roomier fit')

  return { size, confidence: alternative ? 'between' : 'good', alternative, chestCm: Math.round(chest + build), reasons }
}
