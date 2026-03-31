import type { Game } from '../../core/Game.ts'

export async function mountGame(host: HTMLElement): Promise<Game> {
  const gameModPromise = import('../../core/Game.ts')
  const ghostCfgPromise = import('../ghost/ghostConfig.ts')
  const ghostLoadPromise = import('../ghost/ghostGltfAsset.ts')
  void (async () => {
    const [{ loadWispPickupGltf, WISP_GLTF_URL }] = await Promise.all([
      import('../wisp/wispGltfAsset.ts'),
    ])
    await loadWispPickupGltf(WISP_GLTF_URL)
  })()

  const [{ GHOST_GLTF_URL }, { loadGhostEnemyGltf }] = await Promise.all([
    ghostCfgPromise,
    ghostLoadPromise,
  ])
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
  const { Game } = await gameModPromise
  return new Game(host, loaded.ok ? loaded.template : null)
}
