/**
 * Chain whip — lateral swing from sharp turns (no rigid-body physics).
 * All values are tunable for feel vs controllability.
 */

/** How fast the whip lateral state catches the target (lower = more follow delay / lag) */
export const WHIP_FOLLOW_SMOOTH = 7.2

/** Per second decay of whip offset when not turning sharply (inertia bleed-off) */
export const WHIP_INERTIA_DECAY = 3.8

/** Scales turn rate × speed into lateral offset strength */
export const WHIP_MULTIPLIER = 0.052

/** Hard cap on lateral offset applied along perpendicular (world units) */
export const WHIP_MAX_LATERAL = 1.35

/** Extra lateral per segment index (tail swings more than head) */
export const WHIP_SEGMENT_SPREAD = 0.24

/** Reference turn rate (rad/s) for normalizing whip intensity display / hits */
export const WHIP_TURN_RATE_REF = 7.5

/** Minimum player speed (XZ) before whip builds from turning (reduces jitter when idle) */
export const WHIP_MIN_SPEED = 0.55

/** Low-pass on velocity used for heading (higher = less noise, more lag on direction) */
export const WHIP_VELOCITY_FILTER = 9

/** Hit test: added to chain segment effective radius for whip kills (world units) */
export const WHIP_HIT_RADIUS_EXTRA = 0.12

/** Normalized whip intensity 0..1 must exceed this to damage enemies */
export const WHIP_HIT_INTENSITY_THRESHOLD = 0.14

/** Credits per enemy destroyed by whip (non–power-mode) */
export const WHIP_ENEMY_KILL_CREDITS = 1
