import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'

/** World pickup: small emissive sphere (normal pellets — keep smaller than power) */
const PICKUP_RADIUS = 0.14
const PICKUP_SEGMENTS = 18

/** Letter pellets: slightly smaller than crystal pellets */
const LETTER_PICKUP_RADIUS = 0.12
const LETTER_LABEL_WORLD_SCALE = 0.56

/** Carried stack: slightly smaller */
const STACK_RADIUS = 0.16
const STACK_SEGMENTS = 16
const LETTER_LABEL_STACK_SCALE = 0.34

function colorsForHue(hue: number): { core: Color; emissive: Color } {
  const core = new Color().setHSL(hue, 0.78, 0.52)
  const emissive = new Color().setHSL(hue, 0.55, 0.62)
  return { core, emissive }
}

/** Single mesh: strong emissive for arcade contrast vs ground (top-down). */
function createPelletMesh(
  radius: number,
  segments: number,
  core: Color,
  emissive: Color,
): Mesh {
  const mat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 0.95,
    roughness: 0.26,
    metalness: 0.05,
  })
  const mesh = new Mesh(new SphereGeometry(radius, segments, segments), mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = radius
  return mesh
}

/** White “pill” — black letter is drawn on the billboard sprite. */
function createWhitePelletSphereAtCenter(
  radius: number,
  segments: number,
): Mesh {
  const mat = new MeshStandardMaterial({
    color: new Color(0xf5f5f8),
    emissive: new Color(0xffffff),
    emissiveIntensity: 0.14,
    roughness: 0.32,
    metalness: 0.03,
  })
  const mesh = new Mesh(new SphereGeometry(radius, segments, segments), mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(0, 0, 0)
  return mesh
}

function createBlackLetterOnWhiteSprite(letter: string): Sprite {
  const ch = letter.charAt(0).toUpperCase()
  const canvas = document.createElement('canvas')
  const W = 256
  canvas.width = W
  canvas.height = W
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas not available')
  }
  const cx = W / 2
  const cy = W / 2
  ctx.clearRect(0, 0, W, W)

  const badgeR = 100
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, badgeR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)'
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.font = '900 168px system-ui, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = 14
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.strokeText(ch, cx, cy + 4)
  ctx.lineWidth = 7
  ctx.strokeStyle = '#0a0a12'
  ctx.strokeText(ch, cx, cy + 4)
  ctx.fillStyle = '#080810'
  ctx.fillText(ch, cx, cy + 4)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8

  const sprite = new Sprite(
    new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  )
  sprite.name = 'pelletLetterLabel'
  sprite.renderOrder = 2
  return sprite
}

export function createPelletPickupMeshFromHue(hue: number): Mesh {
  const { core, emissive } = colorsForHue(hue)
  return createPelletMesh(PICKUP_RADIUS, PICKUP_SEGMENTS, core, emissive)
}

/**
 * Letter mode: compact white sphere + black letter on white badge (billboard).
 * Root Y is `LETTER_PICKUP_RADIUS` so spawn height matches a single-mesh pellet.
 */
export function createPelletPickupMeshFromLetter(letter: string): Group {
  const root = new Group()
  root.name = 'letterPelletPickup'

  const sphere = createWhitePelletSphereAtCenter(
    LETTER_PICKUP_RADIUS,
    PICKUP_SEGMENTS,
  )
  root.add(sphere)

  const label = createBlackLetterOnWhiteSprite(letter)
  label.position.set(0, LETTER_PICKUP_RADIUS, 0)
  label.scale.set(LETTER_LABEL_WORLD_SCALE, LETTER_LABEL_WORLD_SCALE, 1)
  root.add(label)

  root.position.y = LETTER_PICKUP_RADIUS
  return root
}

/**
 * Power pellet: much larger, purple/blue, halo + pulse driven in `ItemWorld.updateVisuals`.
 */
export function createPowerPelletPickupMesh(): Group {
  const root = new Group()
  const bodyR = 0.44
  const core = new Color(0x6b4cff)
  const emissive = new Color(0xb8a8ff)
  const mat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 1.42,
    roughness: 0.12,
    metalness: 0.14,
  })
  const body = new Mesh(new SphereGeometry(bodyR, 28, 22), mat)
  body.name = 'powerPelletBody'
  body.castShadow = true
  body.receiveShadow = true
  body.position.y = bodyR
  root.add(body)

  const haloMat = new MeshStandardMaterial({
    color: new Color(0x8c7cff),
    emissive: new Color(0x5a3dff),
    emissiveIntensity: 0.78,
    transparent: true,
    opacity: 0.42,
    roughness: 0.4,
    depthWrite: false,
  })
  const halo = new Mesh(
    new SphereGeometry(bodyR * 1.52, 18, 14),
    haloMat,
  )
  halo.name = 'powerPelletHalo'
  halo.position.y = bodyR
  root.add(halo)

  root.userData.powerPelletBody = body
  root.userData.powerPelletHalo = halo
  return root
}

/** Compact mesh for carried stack (world pickup uses `createPowerPelletPickupMesh`). */
function createPowerPelletStackMesh(): Mesh {
  const core = new Color(0x6b4cff)
  const emissive = new Color(0xb8a8ff)
  const mat = new MeshStandardMaterial({
    color: core,
    emissive,
    emissiveIntensity: 1.15,
    roughness: 0.14,
    metalness: 0.12,
  })
  const mesh = new Mesh(
    new SphereGeometry(STACK_RADIUS * 1.15, 14, 12),
    mat,
  )
  mesh.position.y = STACK_RADIUS * 1.15
  return mesh
}

function createLetterStackGroup(letter: string): Group {
  const root = new Group()
  root.name = 'letterPelletStack'
  root.add(createWhitePelletSphereAtCenter(STACK_RADIUS, STACK_SEGMENTS))
  const label = createBlackLetterOnWhiteSprite(letter)
  label.position.set(0, STACK_RADIUS, 0)
  label.scale.set(LETTER_LABEL_STACK_SCALE, LETTER_LABEL_STACK_SCALE, 1)
  root.add(label)
  root.position.y = STACK_RADIUS
  return root
}

export function createPelletStackMesh(item: GameItem): Mesh | Group {
  if (item.type === 'crystal') {
    const { core, emissive } = colorsForHue(item.hue)
    return createPelletMesh(STACK_RADIUS, STACK_SEGMENTS, core, emissive)
  }
  if (item.type === 'powerPellet') {
    return createPowerPelletStackMesh()
  }
  return createLetterStackGroup(item.letter)
}
