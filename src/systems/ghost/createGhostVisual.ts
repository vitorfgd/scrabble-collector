import {
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { GHOST_VISUAL_SCALE } from './ghostConfig.ts'

/**
 * Silhouette from `version3` branch (`createGhostEnemy` / Pac-Man–style dome + skirt).
 * Shared geometries for performance; call `disposeGhostSharedGeometry()` on shutdown.
 */
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

const markShared = (m: Mesh): void => {
  m.userData.sharedGhostGeometry = true
}

export function disposeGhostSharedGeometry(): void {
  BODY_GEO.dispose()
  EYE_WHITE_GEO.dispose()
  PUPIL_GEO.dispose()
}

/**
 * Stylized ghost (dome + soft skirt via lathe). Matches repo `version3` enemy look + bob / pupils.
 */
export function createGhostVisual(bodyColor: number): Group {
  const root = new Group()
  const bobGroup = new Group()
  bobGroup.name = 'ghostBob'
  root.add(bobGroup)

  const baseColor = new Color(bodyColor)
  const bodyMat = new MeshStandardMaterial({
    color: baseColor,
    emissive: baseColor.clone(),
    emissiveIntensity: 0.38,
    roughness: 0.38,
    metalness: 0.08,
  })

  const body = new Mesh(BODY_GEO, bodyMat)
  body.name = 'ghostBody'
  body.userData.isGhostBody = true
  markShared(body)
  body.castShadow = true
  body.receiveShadow = true
  bobGroup.add(body)

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
  markShared(eyeWhiteL)
  markShared(eyeWhiteR)
  markShared(pupilL)
  markShared(pupilR)
  eyeWhiteMat.dispose()
  pupilMat.dispose()

  eyeWhiteL.position.set(-0.12, 0.36, 0.29)
  eyeWhiteR.position.set(0.12, 0.36, 0.29)
  pupilL.position.set(-0.12, 0.36, 0.34)
  pupilR.position.set(0.12, 0.36, 0.34)

  eyeWhiteL.name = 'ghostEyeL'
  eyeWhiteR.name = 'ghostEyeR'
  pupilL.name = 'ghostPupilL'
  pupilR.name = 'ghostPupilR'

  bobGroup.add(eyeWhiteL, eyeWhiteR, pupilL, pupilR)

  const s = GHOST_VISUAL_SCALE
  bobGroup.scale.set(s, s, s)

  const basePupilL = new Vector3(-0.12, 0.36, 0.34)
  const basePupilR = new Vector3(0.12, 0.36, 0.34)
  const baseBobY = bobGroup.position.y
  let animPhase = Math.random() * Math.PI * 2
  const velWorld = new Vector3()
  const qInv = new Quaternion()

  root.userData.updateGhostAnimation = (
    dt: number,
    timeSec: number,
    vx: number,
    vz: number,
  ): void => {
    animPhase += dt * 2.2
    const bob =
      Math.sin(animPhase) * 0.028 + Math.sin(timeSec * 2.8) * 0.01
    bobGroup.position.y = baseBobY + bob

    const wobble = 1 + Math.sin(animPhase * 1.2) * 0.012
    bobGroup.scale.set(s * wobble, s * (1 + Math.sin(animPhase * 1.2) * 0.018), s * wobble)

    const hs = Math.hypot(vx, vz)
    const maxOff = 0.022
    if (hs > 0.06) {
      velWorld.set(vx, 0, vz)
      qInv.copy(root.quaternion).invert()
      velWorld.applyQuaternion(qInv)
      const lateral = velWorld.x / hs
      const forward = velWorld.z / hs
      pupilL.position.x = basePupilL.x + lateral * maxOff
      pupilL.position.z = basePupilL.z + forward * maxOff * 0.4
      pupilL.position.y = basePupilL.y
      pupilR.position.x = basePupilR.x + lateral * maxOff
      pupilR.position.z = basePupilR.z + forward * maxOff * 0.4
      pupilR.position.y = basePupilR.y
    } else {
      pupilL.position.copy(basePupilL)
      pupilR.position.copy(basePupilR)
    }
  }

  root.userData.bobGroup = bobGroup
  return root
}
