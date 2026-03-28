/**
 * Generic collectible payload. Core systems only rely on id / type / value;
 * theme-specific fields (hue, letter, …) are for visuals or future rules.
 */
export type ItemCore = {
  id: string
  type: string
  value: number
}

export type GameItem =
  | (ItemCore & {
      kind: 'collectible'
      type: 'crystal'
      /** Theme-only color hint for Crystal Quarry visuals */
      hue: number
    })
  | (ItemCore & {
      kind: 'collectible'
      type: 'letter'
      /** Single A–Z character for tile display and future word rules */
      letter: string
    })
