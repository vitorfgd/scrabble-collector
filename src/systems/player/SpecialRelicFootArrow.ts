import { ConeGeometry, Group as ThreeGroup, Mesh, MeshStandardMaterial, Vector3 } from 'three'

const scratchPos = new Vector3()

/**
 * Scene-rooted marker at the player’s feet. Yaw is **world** bearing to the relic on XZ,
 * so it does not spin when the character turns.
 */
export function createSpecialRelicFootArrow(): {
  root: ThreeGroup
  setTarget: (
    playerPos: Vector3,
    target: { x: number; z: number } | null,
  ) => void
} {
  const root = new ThreeGroup()
  root.name = 'specialRelicFootArrow'

  const cone = new Mesh(
    new ConeGeometry(0.26, 0.88, 10, 1),
    new MeshStandardMaterial({
      color: 0xffe8b8,
      emissive: 0xffaa33,
      emissiveIntensity: 0.95,
      roughness: 0.32,
      metalness: 0.25,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    }),
  )
  cone.rotation.x = Math.PI / 2
  cone.position.z = 0.72
  cone.renderOrder = 8
  root.add(cone)

  root.visible = false

  return {
    root,
    setTarget(playerPos, target) {
      if (!target) {
        root.visible = false
        return
      }
      const dx = target.x - playerPos.x
      const dz = target.z - playerPos.z
      const len = Math.hypot(dx, dz)
      if (len < 0.55) {
        root.visible = false
        return
      }
      const dirX = dx / len
      const dirZ = dz / len

      scratchPos.set(playerPos.x, playerPos.y + 0.06, playerPos.z)
      root.position.copy(scratchPos)

      // Local +Z aligns with world (dirX, dirZ) when rotation.y = atan2(dirX, dirZ).
      root.rotation.set(0, Math.atan2(dirX, dirZ), 0)
      root.visible = true
    },
  }
}
