import type { Mesh } from 'three'

const PICKUP_ANIM_KEY = 'pickupIdle' as const

export type PickupIdleState = {
  baseY: number
  phase: number
  bobAmp: number
  bobHz: number
  spinRadPerSec: number
}

/** Visual-only idle motion for world pickups (bob + slow spin). */
export function attachPickupIdleMotion(mesh: Mesh): void {
  const st: PickupIdleState = {
    baseY: mesh.position.y,
    phase: Math.random() * Math.PI * 2,
    bobAmp: 0.055 + Math.random() * 0.06,
    bobHz: 0.9 + Math.random() * 0.5,
    spinRadPerSec: 0.35 + Math.random() * 0.55,
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
  mesh.position.y =
    st.baseY +
    Math.sin(timeSec * (Math.PI * 2) * st.bobHz + st.phase) * st.bobAmp
  mesh.rotation.y += dt * st.spinRadPerSec
}
