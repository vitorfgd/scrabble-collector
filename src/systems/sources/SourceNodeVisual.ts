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
      emissiveIntensity: 0.09,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
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
      emissiveIntensity: 0.2,
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
  const baseFillOpacity = fillMat.opacity

  return {
    root,
    setAccelerationVisual: (active: boolean, timeSec: number) => {
      if (!active) {
        fillMat.emissiveIntensity = baseFillEmissive
        ringMat.emissiveIntensity = baseRingEmissive
        fillMat.opacity = baseFillOpacity
        return
      }
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2)
      fillMat.emissiveIntensity = baseFillEmissive + 0.1 * pulse
      ringMat.emissiveIntensity = baseRingEmissive + 0.22 * pulse
      fillMat.opacity = baseFillOpacity + 0.1 * pulse
    },
    dispose: () => {
      fill.geometry.dispose()
      ring.geometry.dispose()
      fillMat.dispose()
      ringMat.dispose()
    },
  }
}
