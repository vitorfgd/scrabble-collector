import type { Group, Mesh } from 'three'
import {
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Mesh as ThreeMesh,
} from 'three'

const FLASH_SEC = 0.28
const BURST_SEC = 0.36
const BASE_PLANE_EMISSIVE = 0.28
const BASE_RING_EMISSIVE = 0.12

export class DepositZoneFeedback {
  private flashT = 0
  private burstT = 0
  private readonly zonePlane: Mesh
  private readonly zoneRing: Mesh | null
  private readonly baseScale: number
  private readonly burstRing: ThreeMesh
  private burstRingLife = 0
  private burstRingMaxLife = 0.4
  private burstRingStrong = false

  constructor(zonePlane: Mesh, zoneRing: Mesh | null, depositRoot: Group) {
    this.zonePlane = zonePlane
    this.zoneRing = zoneRing
    this.baseScale = zonePlane.scale.x

    const ringMat = new MeshBasicMaterial({
      color: 0xffe8a0,
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthWrite: false,
    })
    this.burstRing = new ThreeMesh(new RingGeometry(0.55, 0.72, 40), ringMat)
    this.burstRing.rotation.x = -Math.PI / 2
    this.burstRing.position.y = 0.038
    this.burstRing.visible = false
    this.burstRing.scale.setScalar(0.15)
    depositRoot.add(this.burstRing)
  }

  triggerItem(): void {
    this.burstRingStrong = false
    this.flashT = FLASH_SEC * 0.85
  }

  trigger(): void {
    this.burstRingStrong = false
    this.flashT = FLASH_SEC
    this.burstT = BURST_SEC
  }

  triggerOverloadItemImpact(perfect: boolean): void {
    this.flashT = FLASH_SEC * (perfect ? 1.1 : 0.95)
    const planeMat = this.zonePlane.material as MeshStandardMaterial
    planeMat.emissiveIntensity =
      BASE_PLANE_EMISSIVE + (perfect ? 0.35 : 0.2)
  }

  triggerOverloadBurst(perfect: boolean): void {
    this.burstRingStrong = perfect
    this.flashT = FLASH_SEC * 1.15
    this.burstT = BURST_SEC * (perfect ? 1.35 : 1)
    this.burstRingMaxLife = perfect ? 0.48 : 0.36
    this.burstRingLife = this.burstRingMaxLife
    this.burstRing.visible = true
    this.burstRing.scale.setScalar(0.2)
    const mat = this.burstRing.material as MeshBasicMaterial
    mat.opacity = perfect ? 0.72 : 0.58
  }

  update(dt: number): void {
    const planeMat = this.zonePlane.material as MeshStandardMaterial

    if (this.burstRingLife > 0) {
      this.burstRingLife -= dt
      const p = Math.max(0, this.burstRingLife / this.burstRingMaxLife)
      const s = 0.2 + (2.15 - 0.2) * (1 - p)
      this.burstRing.scale.setScalar(s)
      const mat = this.burstRing.material as MeshBasicMaterial
      const baseOp = this.burstRingStrong ? 0.72 : 0.58
      mat.opacity = baseOp * p
      if (this.burstRingLife <= 0) {
        this.burstRing.visible = false
        mat.opacity = 0
      }
    }

    if (this.burstT > 0) {
      this.burstT -= dt
      const p = Math.max(0, this.burstT / BURST_SEC)
      const amp = this.burstRingStrong ? 0.1 : 0.07
      const pulse = 1 + amp * Math.sin((1 - p) * Math.PI)
      this.zonePlane.scale.setScalar(this.baseScale * pulse)
      if (this.burstT <= 0) {
        this.zonePlane.scale.setScalar(this.baseScale)
      }
    }

    if (this.flashT <= 0) {
      planeMat.emissiveIntensity = BASE_PLANE_EMISSIVE
      if (this.zoneRing) {
        const ringMat = this.zoneRing.material as MeshStandardMaterial
        ringMat.emissiveIntensity = BASE_RING_EMISSIVE
      }
      return
    }

    this.flashT -= dt
    const t = Math.max(0, this.flashT)
    const p = t / FLASH_SEC
    const strength = p * p

    planeMat.emissiveIntensity = BASE_PLANE_EMISSIVE + 0.85 * strength

    if (this.zoneRing) {
      const ringMat = this.zoneRing.material as MeshStandardMaterial
      ringMat.emissiveIntensity = BASE_RING_EMISSIVE + 0.7 * strength
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
