import type { Mesh } from 'three'

const PICKUP_ANIM_KEY = 'pickupIdle' as const

export type PickupIdleState = {
  baseY: number
  phase: number
  bobAmp: number
  bobHz: number
  spinRadPerSec: number
}

export type PickupMotionProfile = 'crystal' | 'letter'

/** Visual-only idle motion for world pickups (bob + slow spin). */
export function attachPickupIdleMotion(
  mesh: Mesh,
  profile: PickupMotionProfile = 'crystal',
): void {
  const isLetter = profile === 'letter'
  const st: PickupIdleState = {
    baseY: mesh.position.y,
    phase: Math.random() * Math.PI * 2,
    bobAmp: isLetter
      ? 0.012 + Math.random() * 0.008
      : 0.038 + Math.random() * 0.035,
    bobHz: isLetter ? 0.35 + Math.random() * 0.15 : 0.85 + Math.random() * 0.45,
    spinRadPerSec: isLetter
      ? 0.06 + Math.random() * 0.06
      : 0.32 + Math.random() * 0.45,
  }
  mesh.userData[PICKUP_ANIM_KEY] = st
}

export function updatePickupIdleMotion(
  mesh: Mesh,
  timeSec: number,
  dt: number,
): void {
  const st = mesh.userData[PICKUP_ANIM_KEY] as PickupIdleState | undefined
  if (!st) return
  const s = Math.sin(timeSec * (Math.PI * 2) * st.bobHz + st.phase)
  /** Only bob upward from rest so tiles never clip through the ground */
  const up = (s * 0.5 + 0.5) * st.bobAmp
  mesh.position.y = st.baseY + up
  mesh.rotation.y += dt * st.spinRadPerSec
}
