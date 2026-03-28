import { Game } from '../../core/Game.ts'

export function mountGame(host: HTMLElement): Game {
  return new Game(host)
}
