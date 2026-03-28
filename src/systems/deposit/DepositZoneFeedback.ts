import type { Mesh } from 'three'
import { MeshStandardMaterial } from 'three'

const FLASH_SEC = 0.32
const BASE_PLANE_EMISSIVE = 0.25
const BASE_RING_EMISSIVE = 0.12

/** Short emissive pulse on ground deposit visuals (not tied to item type) */
export class DepositZoneFeedback {
  private flashT = 0
  private readonly zonePlane: Mesh
  private readonly zoneRing: Mesh | null

  constructor(zonePlane: Mesh, zoneRing: Mesh | null) {
    this.zonePlane = zonePlane
    this.zoneRing = zoneRing
  }

  trigger(): void {
    this.flashT = FLASH_SEC
  }

  update(dt: number): void {
    if (this.flashT <= 0) return

    this.flashT -= dt
    const t = Math.max(0, this.flashT)
    const p = t / FLASH_SEC
    const strength = p * p

    const planeMat = this.zonePlane.material as MeshStandardMaterial
    planeMat.emissiveIntensity = BASE_PLANE_EMISSIVE + 0.75 * strength

    if (this.zoneRing) {
      const ringMat = this.zoneRing.material as MeshStandardMaterial
      ringMat.emissiveIntensity = BASE_RING_EMISSIVE + 0.65 * strength
    }

    if (this.flashT <= 0) {
      this.flashT = 0
      planeMat.emissiveIntensity = BASE_PLANE_EMISSIVE
      if (this.zoneRing) {
        const ringMat = this.zoneRing.material as MeshStandardMaterial
        ringMat.emissiveIntensity = BASE_RING_EMISSIVE
      }
    }
  }
}
