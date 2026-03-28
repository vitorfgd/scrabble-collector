import type { GameItem } from '../../core/types/GameItem.ts'

/** Theme-only: builds collectible data for Crystal Quarry (pellet visuals via ItemVisuals) */
export function createCrystalItem(hue: number, value: number): GameItem {
  return {
    id: crypto.randomUUID(),
    kind: 'collectible',
    type: 'crystal',
    hue,
    value,
  }
}
