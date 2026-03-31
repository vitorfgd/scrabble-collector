import { Game } from '../../core/Game.ts'
import { GHOST_GLTF_URL } from '../ghost/ghostConfig.ts'
import { loadGhostEnemyGltf } from '../ghost/ghostGltfAsset.ts'

export async function mountGame(host: HTMLElement): Promise<Game> {
  const loaded = await loadGhostEnemyGltf(GHOST_GLTF_URL)
  if (!loaded.ok) {
    console.warn(
      '[ghost] Using procedural enemy mesh. GLB not used. Reason:',
      loaded.error,
      '| Expected file:',
      GHOST_GLTF_URL,
      '(under public/) with at least one animation; clips matched by name: idle, chasing (or chase/run).',
    )
  }
  return new Game(host, loaded.ok ? loaded.template : null)
}
