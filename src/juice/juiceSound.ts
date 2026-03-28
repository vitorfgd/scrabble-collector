/** Hook for future WebAudio / SFX. No-op until wired. */
export type JuiceSoundId =
  | 'pickup'
  | 'deposit_item'
  | 'deposit_complete'
  | 'money_tick'
  | 'overload_impact'
  | 'ghost_hit'
  | 'power_pellet'
  | 'ghost_eat'

export function playJuiceSound(_id: JuiceSoundId): void {
  // Intentionally empty — swap for AudioBufferSource or asset pipeline.
}
