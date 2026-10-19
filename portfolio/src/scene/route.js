// The road trip: one smooth curve from Chennai to the Pamban bridge. The camera and the auto follow it.
import * as THREE from 'three'
import { clamp } from './util.js'

export { STOPS } from './stops.js'

const POINTS = [
  [0, 0, 0],
  [6, 0, -90],
  [-14, 0, -190],
  [-30, 0, -300],
  [-10, 0, -410],
  [28, 0, -520],
  [38, 0, -640],
  [12, 0, -760],
  [-6, 0, -860],
  [-8, 0, -930],
  [-8, 5, -1000],
  [-8, 5, -1100],
  [-8, 5, -1260],
]

const UP = new THREE.Vector3(0, 1, 0)

export function createRoute() {
  const curve = new THREE.CatmullRomCurve3(
    POINTS.map((p) => new THREE.Vector3(...p)),
    false,
    'catmullrom',
    0.5,
  )
  curve.arcLengthDivisions = 1500
  const length = curve.getLength()

  // Position, direction and "right of the road" at u. Pass a sample object to avoid allocating every frame.
  const sample = () => ({ pos: new THREE.Vector3(), tan: new THREE.Vector3(), right: new THREE.Vector3() })
  const at = (u, out = sample()) => {
    const x = clamp(u, 0, 1)
    curve.getPointAt(x, out.pos)
    curve.getTangentAt(x, out.tan).normalize()
    out.right.crossVectors(out.tan, UP).normalize()
    return out
  }

  // A point beside the road (positive lateral = right side).
  const side = (u, lateral, lift = 0) => {
    const s = at(u)
    return s.pos.addScaledVector(s.right, lateral).add(new THREE.Vector3(0, lift, 0))
  }

  // First point where the road climbs onto the bridge.
  let bridgeU = 0.8
  for (let u = 0.6; u < 1; u += 0.002) {
    if (curve.getPointAt(u).y > 0.5) {
      bridgeU = u
      break
    }
  }

  return { curve, length, at, side, sample, bridgeU }
}

// Ground kept clear for landmarks, so palms and houses don't grow through them.
// [from u, to u, nearest lateral, farthest lateral] (positive lateral = right of the road)
const RESERVED = [
  [0.035, 0.11, 22, 100],
  [0.2, 0.33, 30, 130],
  [0.37, 0.57, 6, 200],
  [0.63, 0.73, 6, 140],
]
export const isReserved = (u, lateral) => RESERVED.some(([a, b, l0, l1]) => u >= a && u <= b && lateral >= l0 && lateral <= l1)

// Turns a landmark so its front (local +Z) faces the road.
export function faceRoad(object, route, u) {
  const s = route.at(u)
  object.rotation.y = Math.atan2(-s.right.x, -s.right.z)
}
