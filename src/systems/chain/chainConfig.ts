/**
 * Chain tail — PacManScrabble-style arc-length trail (see `SnakeTrail.ts`).
 *
 * Tuning:
 * - segmentSpacing → CHAIN_LINK_SPACING (fixed spacing along the head path)
 * - trail history cap → CHAIN_TRAIL_MAX_POINTS (how far back the path is kept)
 *
 * Whip gameplay (`ChainWhipHunter`) still uses `chainWhipConfig.ts` for intensity thresholds;
 * tail *positions* come only from the trail, not from lateral whip offsets.
 */

/** Fixed distance along the head path to each segment (matches PacMan `SnakeTrail.segmentSpacing` intent) */
export const CHAIN_LINK_SPACING = 0.52

export const CHAIN_SEGMENT_SPACING = CHAIN_LINK_SPACING

/**
 * Max stored head samples (one per frame). Older points drop off; tail length in world
 * is effectively unbounded for normal gameplay.
 */
export const CHAIN_TRAIL_MAX_POINTS = 6000

/** Extra scale on carried pickup mesh (readability) */
export const CHAIN_MESH_SCALE = 1.24

/** Head→tail gradient: emissive boost on newer links (0 = off) */
export const CHAIN_GRADIENT_EMISSIVE_MIX = 0.14

/** Floating height (world Y) for chain item centers */
export const CHAIN_FLOAT_Y = 0.28

export const CHAIN_ADD_BOUNCE = 0.12
export const CHAIN_BOUNCE_DECAY = 14

export const CHAIN_POWER_EMISSIVE_HEX = 0x55eeff
export const CHAIN_POWER_EMISSIVE_INTENSITY = 1.05
export const CHAIN_POWER_VISUAL_LERP = 12
