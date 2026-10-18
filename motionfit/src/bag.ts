import { itemById } from './catalog'
import type { Size } from './size'

export interface BagLine {
  item: string
  variant: string
  size: Size
  qty: number
}

export const FREE_DELIVERY_FROM = 1999
export const DELIVERY_FEE = 99

export function addLine(bag: BagLine[], line: Omit<BagLine, 'qty'>): BagLine[] {
  const i = bag.findIndex((l) => l.item === line.item && l.variant === line.variant && l.size === line.size)
  if (i >= 0) return bag.map((l, k) => (k === i ? { ...l, qty: Math.min(9, l.qty + 1) } : l))
  return [...bag, { ...line, qty: 1 }]
}

export function setQty(bag: BagLine[], index: number, qty: number): BagLine[] {
  if (qty <= 0) return bag.filter((_, k) => k !== index)
  return bag.map((l, k) => (k === index ? { ...l, qty: Math.min(9, qty) } : l))
}

export function totals(bag: BagLine[], priceOf: (id: string) => number = (id) => itemById.get(id)?.price ?? 0) {
  const subtotal = bag.reduce((s, l) => s + priceOf(l.item) * l.qty, 0)
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE
  const count = bag.reduce((s, l) => s + l.qty, 0)
  return { subtotal, delivery, total: subtotal + delivery, count }
}
