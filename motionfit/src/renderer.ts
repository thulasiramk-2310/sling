import * as THREE from 'three'
import type { Body, Pt } from './body'
import type { Item, Variant } from './catalog'
import { SLEEVE, TORSO, paintSleeve, paintTorso } from './garmentArt'

// A deformable grid: positions are rewritten every frame from body key points, UVs stay fixed.
function grid(cols: number, rows: number) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array((cols + 1) * (rows + 1) * 3)
  const uv = new Float32Array((cols + 1) * (rows + 1) * 2)
  const idx: number[] = []
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      const i = r * (cols + 1) + c
      uv[i * 2] = c / cols
      uv[i * 2 + 1] = 1 - r / rows
      if (r < rows && c < cols) idx.push(i, i + cols + 1, i + 1, i + 1, i + cols + 1, i + cols + 2)
    }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return { g, cols, rows }
}

const lerp = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const len = (a: Pt) => Math.hypot(a.x, a.y)

export class GarmentRenderer {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10)
  private torso = grid(12, 16)
  private sleeves = [grid(2, 24), grid(2, 24)]
  private torsoMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, side: THREE.DoubleSide })
  // The two sleeves are mirror images, so one of them always faces away from the camera.
  private sleeveMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, side: THREE.DoubleSide })
  private meshes: THREE.Mesh[] = []
  private textures: THREE.Texture[] = []

  constructor() {
    this.canvas = document.createElement('canvas')
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    for (const [i, s] of this.sleeves.entries()) {
      const m = new THREE.Mesh(s.g, this.sleeveMat)
      m.renderOrder = i
      m.frustumCulled = false
      this.scene.add(m)
      this.meshes.push(m)
    }
    const t = new THREE.Mesh(this.torso.g, this.torsoMat)
    t.renderOrder = 5
    t.frustumCulled = false
    this.scene.add(t)
    this.meshes.push(t)
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false)
    this.camera.left = 0
    this.camera.right = w
    this.camera.top = 0
    this.camera.bottom = h
    this.camera.updateProjectionMatrix()
  }

  setGarment(item: Item, variant: Variant) {
    this.textures.forEach((t) => t.dispose())
    const torso = new THREE.CanvasTexture(paintTorso(item, variant))
    const sleeve = new THREE.CanvasTexture(paintSleeve(item, variant))
    for (const t of [torso, sleeve]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
    }
    this.textures = [torso, sleeve]
    this.torsoMat.map = torso
    this.sleeveMat.map = sleeve
    this.torsoMat.needsUpdate = this.sleeveMat.needsUpdate = true
  }

  update(body: Body | null) {
    this.meshes.forEach((m) => (m.visible = !!body))
    if (!body) return
    this.layoutTorso(body)
    this.layoutSleeve(this.sleeves[0], body.shoulderR, body.elbowR, body.wristR, body, -1)
    this.layoutSleeve(this.sleeves[1], body.shoulderL, body.elbowL, body.wristL, body, 1)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  private layoutTorso(b: Body) {
    const { g, cols, rows } = this.torso
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const midS = lerp(b.shoulderR, b.shoulderL, 0.5)
    const midH = lerp(b.hipR, b.hipL, 0.5)
    const D = sub(midH, midS)
    const acrossTop = sub(b.shoulderL, b.shoulderR)
    const acrossBot = sub(b.hipL, b.hipR)
    const sw = len(acrossTop)
    // Texture rows: shoulder line at y=96, hip line at y=520 of 640, so the edges extend beyond both lines.
    const topK = -TORSO.shoulderY / (TORSO.hipY - TORSO.shoulderY)
    const botK = 1 + (TORSO.h - TORSO.hipY) / (TORSO.hipY - TORSO.shoulderY)
    const top = { x: midS.x + D.x * topK, y: midS.y + D.y * topK }
    const bot = { x: midS.x + D.x * botK, y: midS.y + D.y * botK }
    const widthScale = TORSO.w / (TORSO.shoulderR - TORSO.shoulderL)
    const topDir = { x: acrossTop.x / sw, y: acrossTop.y / sw }
    const botLen = Math.max(len(acrossBot), sw * 0.94)
    const botDir = { x: acrossBot.x / (len(acrossBot) || 1), y: acrossBot.y / (len(acrossBot) || 1) }
    // Cloth hangs fairly straight from the chest instead of hugging the waist.
    const topW = sw * widthScale
    const botW = botLen * widthScale * 0.98
    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      for (let c = 0; c <= cols; c++) {
        const u = c / cols - 0.5
        const a = { x: top.x + topDir.x * u * topW, y: top.y + topDir.y * u * topW }
        const z = { x: bot.x + botDir.x * u * botW, y: bot.y + botDir.y * u * botW }
        // A gentle outward bow over the chest gives the flat piece some volume.
        const bow = Math.sin(v * Math.PI) * u * sw * 0.05
        const p = lerp(a, z, v)
        const i = r * (cols + 1) + c
        pos.setXYZ(i, p.x + topDir.x * bow, p.y + topDir.y * bow, 0)
      }
    }
    pos.needsUpdate = true
  }

  private layoutSleeve(s: ReturnType<typeof grid>, shoulder: Pt, elbow: Pt, wrist: Pt, b: Body, side: 1 | -1) {
    const pos = s.g.getAttribute('position') as THREE.BufferAttribute
    const sw = len(sub(b.shoulderL, b.shoulderR))
    const out = sub(b.shoulderL, b.shoulderR)
    const start = { x: shoulder.x + (out.x / sw) * side * sw * 0.06, y: shoulder.y + (out.y / sw) * side * sw * 0.06 + sw * 0.02 }
    const seg1 = len(sub(elbow, start))
    const seg2 = len(sub(wrist, elbow))
    const total = seg1 + seg2 || 1
    // Sleeve texture rows span shoulder seam to wrist, so short sleeves are just transparent below the cuff.
    const widthAt = (t: number) => sw * (0.4 - 0.2 * t) * (SLEEVE.w / 228)
    for (let r = 0; r <= s.rows; r++) {
      const t = r / s.rows
      const d = t * total
      let p: Pt
      let dir: Pt
      if (d <= seg1) {
        p = lerp(start, elbow, seg1 ? d / seg1 : 0)
        dir = sub(elbow, start)
      } else {
        p = lerp(elbow, wrist, seg2 ? (d - seg1) / seg2 : 0)
        dir = sub(wrist, elbow)
      }
      // Blend directions around the elbow so the sleeve bends instead of kinking.
      const k = Math.max(0, 1 - Math.abs(d - seg1) / (total * 0.12))
      if (k > 0) {
        const a = sub(elbow, start)
        const c = sub(wrist, elbow)
        const la = len(a) || 1
        const lc = len(c) || 1
        dir = { x: (a.x / la) * (1 - k * 0.5) + (c.x / lc) * k * 0.5, y: (a.y / la) * (1 - k * 0.5) + (c.y / lc) * k * 0.5 }
      }
      const ld = len(dir) || 1
      const n = { x: -dir.y / ld, y: dir.x / ld }
      const w = widthAt(t)
      for (let c = 0; c <= s.cols; c++) {
        const u = (c / s.cols - 0.5) * side
        const i = r * (s.cols + 1) + c
        pos.setXYZ(i, p.x + n.x * u * w, p.y + n.y * u * w, 0)
      }
    }
    pos.needsUpdate = true
  }
}
