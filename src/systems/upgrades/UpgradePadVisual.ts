import {
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three'

export const UPGRADE_PAD_RADIUS = 1.9
/** Overlap test matches deposit-style circle vs player */
export const UPGRADE_PAD_ZONE_RADIUS = 1.95

export type PadLabelPayload = {
  title: string
  costLine: string
  levelLine: string
}

/**
 * Ground pad + camera-facing label. Canvas layout: accent bar, title, cost, level pill.
 */
export function createUpgradePad(
  title: string,
  innerColor: number,
  ringColor: number,
): {
  root: Group
  setLabel: (p: PadLabelPayload) => void
} {
  const root = new Group()
  root.name = `upgradePad:${title}`

  const inner = new Mesh(
    new CircleGeometry(UPGRADE_PAD_RADIUS * 0.78, 40),
    new MeshStandardMaterial({
      color: innerColor,
      roughness: 0.82,
      metalness: 0.06,
      transparent: true,
      opacity: 0.94,
    }),
  )
  inner.rotation.x = -Math.PI / 2
  inner.position.y = 0.018
  inner.receiveShadow = true
  root.add(inner)

  const ring = new Mesh(
    new RingGeometry(UPGRADE_PAD_RADIUS * 0.78, UPGRADE_PAD_RADIUS, 40),
    new MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 0.14,
      roughness: 0.65,
      metalness: 0.12,
      transparent: true,
      opacity: 0.96,
      side: DoubleSide,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.022
  ring.receiveShadow = true
  root.add(ring)

  const canvas = document.createElement('canvas')
  canvas.width = 448
  canvas.height = 236
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas not available')
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace

  const accentHex = `#${ringColor.toString(16).padStart(6, '0')}`

  const draw = (p: PadLabelPayload): void => {
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const pad = 10
    const r = 18
    ctx.fillStyle = 'rgba(12, 14, 24, 0.55)'
    ctx.beginPath()
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = accentHex
    ctx.fillRect(pad + 16, pad + 18, 4, 52)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#f8fafc'
    ctx.font = '800 36px system-ui, Segoe UI, sans-serif'
    ctx.fillText(p.title, pad + 34, pad + 22)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 40px system-ui, Segoe UI, sans-serif'
    ctx.fillStyle = '#6ee7b7'
    ctx.fillText(p.costLine, w / 2, h * 0.52)

    const pillW = 120
    const pillH = 36
    const px = w - pad - pillW - 8
    const py = h - pad - pillH - 8
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.roundRect(px, py, pillW, pillH, 10)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.font = '700 22px system-ui, Segoe UI, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.levelLine, px + pillW / 2, py + pillH / 2)
  }

  draw({ title, costLine: '$—', levelLine: 'Lv 0' })

  const sprite = new Sprite(
    new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    }),
  )
  sprite.position.y = 2.45
  sprite.scale.set(4.1, 2.15, 1)
  root.add(sprite)

  return {
    root,
    setLabel: (p: PadLabelPayload) => {
      draw(p)
      tex.needsUpdate = true
    },
  }
}
