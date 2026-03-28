import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'

/**
 * Simple rounded “ghost” silhouette: bright capsule body + small eyes (top-down readable).
 */
export function createGhostVisual(bodyColor: number): Group {
  const root = new Group()

  const bodyMat = new MeshStandardMaterial({
    color: bodyColor,
    emissive: new Color(bodyColor).multiplyScalar(0.4),
    emissiveIntensity: 0.65,
    roughness: 0.32,
    metalness: 0.04,
  })

  const r = 0.36
  const cylLen = 0.52
  const body = new Mesh(new CapsuleGeometry(r, cylLen, 6, 14), bodyMat)
  body.position.y = r + cylLen * 0.5
  body.castShadow = true
  body.receiveShadow = true
  root.add(body)

  const eyeMat = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0,
  })
  const eyeL = new Mesh(new SphereGeometry(0.085, 8, 8), eyeMat)
  const eyeR = new Mesh(new SphereGeometry(0.085, 8, 8), eyeMat)
  eyeL.position.set(-0.18, 0.62, 0.34)
  eyeR.position.set(0.18, 0.62, 0.34)
  eyeL.castShadow = false
  eyeR.castShadow = false
  root.add(eyeL, eyeR)

  return root
}
