import type { Markers } from './upload'

// Retailer-added garments live in IndexedDB, which can hold product photos (localStorage can't, reliably).
export interface StoredGarment {
  id: string
  name: string
  price: number
  category: 'Tees' | 'Shirts' | 'Jackets' | 'Knitwear'
  sleeves: 'short' | 'long'
  image: Blob
  markers: Markers
  createdAt: number
}

const DB = 'motionfit'
const STORE = 'garments'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const listGarments = () => tx<StoredGarment[]>('readonly', (s) => s.getAll() as IDBRequest<StoredGarment[]>).catch(() => [] as StoredGarment[])
export const saveGarment = (g: StoredGarment) => tx('readwrite', (s) => s.put(g))
export const deleteGarment = (id: string) => tx('readwrite', (s) => s.delete(id))
