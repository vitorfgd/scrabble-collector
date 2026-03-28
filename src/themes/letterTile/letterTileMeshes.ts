import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'

const SIDE_COLOR = new Color(0xcfc6ba)

function createLetterTexture(letter: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas not available')
  }
  const g = ctx.createLinearGradient(0, 0, 160, 160)
  g.addColorStop(0, '#faf6f0')
  g.addColorStop(1, '#e8dfd4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 160, 160)
  ctx.strokeStyle = '#9a8b78'
  ctx.lineWidth = 5
  ctx.strokeRect(6, 6, 148, 148)
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'
  ctx.lineWidth = 2
  ctx.strokeRect(8, 8, 144, 144)
  ctx.fillStyle = '#14141c'
  ctx.font = 'bold 88px system-ui, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255,255,255,0.35)'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1
  ctx.fillText(letter, 80, 82)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Thin tile mesh; top face shows letter texture, sides plain */
function createTileMesh(
  letter: string,
  width: number,
  height: number,
  depth: number,
): Mesh {
  const geom = new BoxGeometry(width, height, depth)
  const topTex = createLetterTexture(letter)
  const topMat = new MeshStandardMaterial({
    map: topTex,
    roughness: 0.48,
    metalness: 0.04,
  })
  const sideMat = new MeshStandardMaterial({
    color: SIDE_COLOR,
    roughness: 0.68,
    metalness: 0.02,
  })
  const mats = [
    sideMat,
    sideMat,
    topMat,
    sideMat,
    sideMat,
    sideMat,
  ]
  const mesh = new Mesh(geom, mats)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function createLetterPickupMesh(
  item: Extract<GameItem, { type: 'letter' }>,
): Mesh {
  const mesh = createTileMesh(item.letter, 0.46, 0.12, 0.46)
  mesh.position.y = 0.26
  return mesh
}

export function createLetterStackMesh(
  item: Extract<GameItem, { type: 'letter' }>,
): Mesh {
  const mesh = createTileMesh(item.letter, 0.36, 0.09, 0.36)
  /** Tilt top face toward camera (rig sits at +Z, elevated) for readability */
  mesh.rotation.x = -0.48
  return mesh
}
