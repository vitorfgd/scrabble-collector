import {
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
} from 'three'
import { ENEMY_GHOST_VISUAL_SCALE } from './enemyGameplayConfig.ts'

/** Shared body silhouette (Pac-Man–style ghost: dome + skirt, not a copy) */
const GHOST_PROFILE: Vector2[] = (() => {
  const p: Vector2[] = []
  p.push(new Vector2(0.002, 0))
  p.push(new Vector2(0.12, 0.025))
  p.push(new Vector2(0.22, 0.055))
  p.push(new Vector2(0.3, 0.1))
  p.push(new Vector2(0.34, 0.18))
  p.push(new Vector2(0.35, 0.28))
  p.push(new Vector2(0.33, 0.38))
  p.push(new Vector2(0.26, 0.48))
  p.push(new Vector2(0.14, 0.56))
  p.push(new Vector2(0, 0.58))
  return p
})()

const BODY_GEO = new LatheGeometry(GHOST_PROFILE, 26)
BODY_GEO.computeVertexNormals()

const EYE_WHITE_GEO = new SphereGeometry(0.068, 10, 8)
const PUPIL_GEO = new SphereGeometry(0.034, 8, 6)

export type GhostEnemyParts = {
  group: Group
  bodyMat: MeshStandardMaterial
  pupilL: Mesh
  pupilR: Mesh
  eyeWhiteL: Mesh
  eyeWhiteR: Mesh
}

/**
 * Stylized ghost (rounded top, soft skirt via lathe profile). Bright emissive body + eyes.
 */
export function createGhostEnemy(colorHex: number): GhostEnemyParts {
  const bodyMat = new MeshStandardMaterial({
    color: new Color(colorHex),
    emissive: new Color(colorHex),
    emissiveIntensity: 0.38,
    roughness: 0.38,
    metalness: 0.08,
  })
  const body = new Mesh(BODY_GEO, bodyMat)
  body.castShadow = true
  body.receiveShadow = true

  const eyeWhiteMat = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
    roughness: 0.35,
    metalness: 0,
  })
  const pupilMat = new MeshStandardMaterial({
    color: 0x0a0a12,
    roughness: 0.5,
    metalness: 0,
  })

  const eyeWhiteL = new Mesh(EYE_WHITE_GEO, eyeWhiteMat.clone())
  const eyeWhiteR = new Mesh(EYE_WHITE_GEO, eyeWhiteMat.clone())
  const pupilL = new Mesh(PUPIL_GEO, pupilMat.clone())
  const pupilR = new Mesh(PUPIL_GEO, pupilMat.clone())
  eyeWhiteMat.dispose()
  pupilMat.dispose()

  eyeWhiteL.position.set(-0.12, 0.36, 0.29)
  eyeWhiteR.position.set(0.12, 0.36, 0.29)
  pupilL.position.set(-0.12, 0.36, 0.34)
  pupilR.position.set(0.12, 0.36, 0.34)

  const group = new Group()
  group.add(body)
  group.add(eyeWhiteL)
  group.add(eyeWhiteR)
  group.add(pupilL)
  group.add(pupilR)

  const s = ENEMY_GHOST_VISUAL_SCALE
  group.scale.set(s, s, s)

  return {
    group,
    bodyMat,
    pupilL,
    pupilR,
    eyeWhiteL,
    eyeWhiteR,
  }
}

export function disposeGhostEnemySharedGeometry(): void {
  BODY_GEO.dispose()
  EYE_WHITE_GEO.dispose()
  PUPIL_GEO.dispose()
}
