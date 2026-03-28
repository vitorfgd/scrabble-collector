/**
 * Tuning for Chase Word bonus vs normal dictionary word play.
 * Normal payout stays in `wordEvaluation.ts`; chase bonus is added on top when multiset matches.
 */
/** Flat bonus for completing the active chase word */
export const CHASE_WORD_BONUS_FLAT = 85
/** Extra gold per letter in the chase target (on top of flat) */
export const CHASE_WORD_BONUS_PER_LETTER = 12

export function computeChaseWordBonus(wordLength: number): number {
  return (
    CHASE_WORD_BONUS_FLAT + Math.max(0, wordLength) * CHASE_WORD_BONUS_PER_LETTER
  )
}
