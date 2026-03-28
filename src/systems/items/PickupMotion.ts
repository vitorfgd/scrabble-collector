import type { Object3D } from 'three'

const PICKUP_ANIM_KEY = 'pickupIdle' as const

export type PickupIdleState = {
  baseY: number
  phase: number
  bobAmp: number
  bobHz: number
  spinRadPerSec: number
}

export type PickupMotionProfile =
  | 'crystal'
  | 'letter'
  | 'pellet'
  /** Letter on pellet sprite: keep spin at 0 so the glyph stays readable */
  | 'letterPellet'

/** Visual-only idle motion for world pickups (bob + slow spin). */
export function attachPickupIdleMotion(
  mesh: Object3D,
  profile: PickupMotionProfile = 'pellet',
): void {
  const isLetterPellet = profile === 'letterPellet'
  const isPellet = profile === 'pellet'
  const isLetter = profile === 'letter'
  const st: PickupIdleState = {
    baseY: mesh.position.y,
    phase: Math.random() * Math.PI * 2,
    bobAmp: isLetterPellet
      ? 0.014 + Math.random() * 0.008
      : isPellet
        ? 0.018 + Math.random() * 0.012
        : isLetter
          ? 0.012 + Math.random() * 0.008
          : 0.038 + Math.random() * 0.035,
    bobHz: isLetterPellet
      ? 0.38 + Math.random() * 0.14
      : isPellet
        ? 0.42 + Math.random() * 0.18
        : isLetter
          ? 0.35 + Math.random() * 0.15
          : 0.85 + Math.random() * 0.45,
    spinRadPerSec: isLetterPellet
      ? 0
      : isPellet
        ? 0.12 + Math.random() * 0.1
        : isLetter
          ? 0.06 + Math.random() * 0.06
          : 0.32 + Math.random() * 0.45,
  }
  mesh.userData[PICKUP_ANIM_KEY] = st
}

export function updatePickupIdleMotion(
  mesh: Object3D,
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
