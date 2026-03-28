import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'

const SIDE_COLOR = new Color(0xd8d0c4)

function createLetterTexture(letter: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas not available')
  }
  ctx.fillStyle = '#f2ebe0'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#b8a990'
  ctx.lineWidth = 6
  ctx.strokeRect(4, 4, 120, 120)
  ctx.fillStyle = '#1a1a22'
  ctx.font = 'bold 78px system-ui, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, 64, 68)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
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
    roughness: 0.55,
    metalness: 0,
  })
  const sideMat = new MeshStandardMaterial({
    color: SIDE_COLOR,
    roughness: 0.72,
    metalness: 0,
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
