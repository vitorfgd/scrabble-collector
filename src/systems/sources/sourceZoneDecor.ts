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
import type { SourceNodeConfig } from './sourceTypes.ts'

const LABEL_Y = 4.35

export type LetterSpawnLabelHandle = {
  sprite: Sprite
  dispose: () => void
}

/**
 * World-space billboard above a source disk: which letter pool spawns here.
 */
export function createLetterSpawnLabel(
  cfg: SourceNodeConfig,
): LetterSpawnLabelHandle {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas not available')
  }

  const isVowel = cfg.letterKind === 'vowel'
  const title = isVowel ? 'VOWEL SOURCE' : 'CONSONANT SOURCE'
  const line2 = isVowel ? 'A  E  I  O  U' : 'B C D F G H J K L M N P Q R S T V W X Y Z'

  const draw = (): void => {
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(8, 10, 18, 0.55)'
    ctx.roundRect(10, 10, w - 20, h - 20, 14)
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isVowel ? '#fde68a' : '#a7f3d0'
    ctx.font = 'bold 40px system-ui, Segoe UI, sans-serif'
    ctx.fillText(title, w / 2, 58)

    ctx.fillStyle = '#f8fafc'
    ctx.font = '600 28px system-ui, Segoe UI, sans-serif'
    ctx.fillText(line2, w / 2, 128)

    ctx.font = '500 22px system-ui, Segoe UI, sans-serif'
    ctx.fillStyle = 'rgba(248,250,252,0.72)'
    ctx.fillText(`zone · ${cfg.id}`, w / 2, 168)
  }

  draw()

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace

  const sprite = new Sprite(
    new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    }),
  )
  sprite.position.set(cfg.worldX, LABEL_Y, cfg.worldZ)
  sprite.scale.set(7.2, 2.25, 1)
  sprite.name = `letterSpawnLabel:${cfg.id}`

  return {
    sprite,
    dispose: () => {
      tex.dispose()
      ;(sprite.material as SpriteMaterial).dispose()
    },
  }
}

export type CrystalFormationHandle = {
  root: Group
  update: (timeSec: number) => void
  dispose: () => void
}

/**
 * Static pellet pile at zone center (shown in crystal spawn mode; matches arcade pickup look).
 */
export function createCrystalFormation(cfg: SourceNodeConfig): CrystalFormationHandle {
  const root = new Group()
  root.name = `crystalFormation:${cfg.id}`
  root.position.set(cfg.worldX, 0, cfg.worldZ)

  const hue = cfg.letterKind === 'vowel' ? 0.12 : 0.52
  const core = new Color().setHSL(hue, 0.72, 0.52)
  const em = new Color().setHSL(hue + 0.02, 0.5, 0.64)

  const pellets: { mesh: Mesh; baseEm: number; phase: number }[] = []

  const addPellet = (
    px: number,
    py: number,
    pz: number,
    radius: number,
    phase: number,
  ): void => {
    const mat = new MeshStandardMaterial({
      color: core.clone(),
      emissive: em.clone(),
      emissiveIntensity: 0.42,
      roughness: 0.22,
      metalness: 0.06,
    })
    const mesh = new Mesh(new SphereGeometry(radius, 14, 12), mat)
    mesh.position.set(px, py, pz)
    mesh.castShadow = true
    mesh.receiveShadow = true
    root.add(mesh)
    pellets.push({ mesh, baseEm: 0.42, phase })
  }

  addPellet(0, 0.13, 0, 0.16, 0)
  addPellet(0.22, 0.11, 0.08, 0.13, 0.7)
  addPellet(-0.18, 0.1, 0.12, 0.12, 1.2)
  addPellet(0.12, 0.09, -0.2, 0.11, 1.9)
  addPellet(-0.1, 0.08, -0.14, 0.1, 2.4)
  addPellet(0.28, 0.07, -0.06, 0.09, 3.1)
  addPellet(-0.26, 0.06, 0.04, 0.09, 3.8)

  return {
    root,
    update: (timeSec: number) => {
      for (const s of pellets) {
        const mat = s.mesh.material as MeshStandardMaterial
        const pulse = 0.18 + 0.14 * Math.sin(timeSec * 2.4 + s.phase)
        mat.emissiveIntensity = s.baseEm + pulse
      }
    },
    dispose: () => {
      root.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          ;(o.material as MeshStandardMaterial).dispose()
        }
      })
    },
  }
}
