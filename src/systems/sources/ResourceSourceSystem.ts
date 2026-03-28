import type { Group, Scene, Sprite } from 'three'
import type { GameItem } from '../../core/types/GameItem.ts'
import type { ItemSpawnMode } from '../items/spawnMode.ts'
import type { ItemWorld } from '../items/ItemWorld.ts'
import type { PlayerController } from '../player/PlayerController.ts'
import { DEFAULT_RESOURCE_SOURCES } from './defaultSources.ts'
import { SourceNode } from './SourceNode.ts'
import { createSourceNodeVisual } from './SourceNodeVisual.ts'
import {
  createCrystalFormation,
  createLetterSpawnLabel,
} from './sourceZoneDecor.ts'
import type { SourceNodeConfig } from './sourceTypes.ts'

export type ResourceSourceSystemOptions = {
  scene: Scene
  itemWorld: ItemWorld
  player: PlayerController
  getSpawnMode: () => ItemSpawnMode
  createCrystalItem: () => GameItem
  createVowelLetterItem: () => GameItem
  createConsonantLetterItem: () => GameItem
  /** Defaults to `DEFAULT_RESOURCE_SOURCES` */
  configs?: readonly SourceNodeConfig[]
}

/**
 * Owns all world resource source nodes: visuals + spawn timers.
 * Replaces legacy full-map scatter spawning.
 */
export class ResourceSourceSystem {
  private readonly nodes: SourceNode[] = []
  private readonly getSpawnMode: () => ItemSpawnMode
  private readonly zoneDecor: Array<{
    letterSprite: Sprite
    crystalRoot: Group
    letterDispose: () => void
    crystalDispose: () => void
    crystalUpdate: (t: number) => void
  }> = []

  constructor(opts: ResourceSourceSystemOptions) {
    this.getSpawnMode = opts.getSpawnMode
    const configs = opts.configs ?? DEFAULT_RESOURCE_SOURCES
    let i = 0
    for (const cfg of configs) {
      const tint =
        cfg.letterKind === 'vowel' ? 0xc9a66b : 0x2f6f5c
      const vis = createSourceNodeVisual(cfg.ringRadius, tint)
      vis.root.position.set(cfg.worldX, 0, cfg.worldZ)
      opts.scene.add(vis.root)

      const letter = createLetterSpawnLabel(cfg)
      opts.scene.add(letter.sprite)

      const crystal = createCrystalFormation(cfg)
      opts.scene.add(crystal.root)

      this.zoneDecor.push({
        letterSprite: letter.sprite,
        crystalRoot: crystal.root,
        letterDispose: letter.dispose,
        crystalDispose: crystal.dispose,
        crystalUpdate: crystal.update,
      })

      const stagger = (i / Math.max(1, configs.length)) * 1.1
      this.nodes.push(
        new SourceNode(
          cfg,
          opts.itemWorld,
          opts.player,
          vis,
          opts.getSpawnMode,
          opts.createCrystalItem,
          opts.createVowelLetterItem,
          opts.createConsonantLetterItem,
          stagger,
        ),
      )
      i += 1
    }
  }

  update(dt: number, timeSec: number): void {
    for (const n of this.nodes) {
      n.update(dt, timeSec)
    }
    if (this.getSpawnMode() === 'crystal') {
      for (const d of this.zoneDecor) {
        d.crystalUpdate(timeSec)
      }
    }
  }

  /**
   * Letter-mode labels vs crystal-mode rock formations (mutually exclusive by spawn mode).
   */
  syncLayoutForMode(mode: ItemSpawnMode): void {
    const showLetter = mode === 'letter'
    const showCrystal = mode === 'crystal'
    for (const d of this.zoneDecor) {
      d.letterSprite.visible = showLetter
      d.crystalRoot.visible = showCrystal
    }
  }

  /** Call when switching crystal/letter mode: clear pickups and stagger spawns */
  onSpawnModeChanged(): void {
    let i = 0
    for (const n of this.nodes) {
      n.resetCooldown((i / Math.max(1, this.nodes.length)) * 0.9)
      i += 1
    }
  }

  dispose(): void {
    for (const n of this.nodes) {
      n.dispose()
    }
    this.nodes.length = 0
    for (const d of this.zoneDecor) {
      d.letterDispose()
      d.crystalDispose()
    }
    this.zoneDecor.length = 0
  }
}
