import type { GameItem } from '../../core/types/GameItem.ts'

export function createPowerPelletItem(): GameItem {
  return {
    id: crypto.randomUUID(),
    kind: 'collectible',
    type: 'powerPellet',
    value: 0,
  }
}
