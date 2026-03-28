import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  CircleGeometry,
} from 'three'

export type SourceNodeVisualHandle = {
  root: Group
  setAccelerationVisual: (active: boolean, timeSec: number) => void
  dispose: () => void
}

/**
 * Visible circular active zone: faint fill + ring; subtle pulse when spawn acceleration is on.
 */
export function createSourceNodeVisual(
  ringRadius: number,
  tint: number,
): SourceNodeVisualHandle {
  const root = new Group()
  root.name = 'sourceNodeVisual'

  const innerR = Math.max(0.15, ringRadius * 0.88)

  const fill = new Mesh(
    new CircleGeometry(innerR, 48),
    new MeshStandardMaterial({
      color: new Color(tint),
      emissive: new Color(tint),
      emissiveIntensity: 0.06,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  )
  fill.rotation.x = -Math.PI / 2
  fill.position.y = 0.018
  fill.receiveShadow = true
  root.add(fill)

  const ringOuter = ringRadius + 0.12
  const ringInner = ringRadius - 0.14
  const ring = new Mesh(
    new RingGeometry(ringInner, ringOuter, 56),
    new MeshStandardMaterial({
      color: new Color(tint),
      emissive: new Color(tint),
      emissiveIntensity: 0.14,
      roughness: 0.65,
      metalness: 0.08,
      transparent: true,
      opacity: 0.75,
      side: DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.022
  ring.receiveShadow = true
  root.add(ring)

  const fillMat = fill.material as MeshStandardMaterial
  const ringMat = ring.material as MeshStandardMaterial
  const baseFillEmissive = fillMat.emissiveIntensity
  const baseRingEmissive = ringMat.emissiveIntensity

  return {
    root,
    setAccelerationVisual: (active: boolean, timeSec: number) => {
      if (!active) {
        fillMat.emissiveIntensity = baseFillEmissive
        ringMat.emissiveIntensity = baseRingEmissive
        fillMat.opacity = 0.22
        return
      }
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2)
      fillMat.emissiveIntensity = baseFillEmissive + 0.1 * pulse
      ringMat.emissiveIntensity = baseRingEmissive + 0.22 * pulse
      fillMat.opacity = 0.22 + 0.08 * pulse
    },
    dispose: () => {
      fill.geometry.dispose()
      ring.geometry.dispose()
      fillMat.dispose()
      ringMat.dispose()
    },
  }
}
