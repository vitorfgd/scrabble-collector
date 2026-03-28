import type { GameItem } from '../../core/types/GameItem.ts'

let idCounter = 0

export function createPowerPelletItem(): GameItem {
  return {
    id: `power-${Date.now()}-${idCounter++}`,
    kind: 'collectible',
    type: 'powerPellet',
    value: 0,
  }
}
