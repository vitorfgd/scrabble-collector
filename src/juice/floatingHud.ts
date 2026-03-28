import { FLOAT_TEXT_SEC } from './juiceConfig.ts'

/** Short-lived floating text in the viewport (e.g. +1, +$4). */
export function spawnFloatingHudText(
  viewport: HTMLElement,
  text: string,
  className: string,
): void {
  const el = document.createElement('div')
  el.className = `float-hud ${className}`
  el.textContent = text
  el.style.left = `${42 + Math.random() * 16}%`
  el.style.top = `${38 + Math.random() * 10}%`
  viewport.appendChild(el)
  requestAnimationFrame(() => {
    el.classList.add('float-hud--show')
  })
  setTimeout(() => {
    el.classList.add('float-hud--out')
    setTimeout(() => el.remove(), 220)
  }, FLOAT_TEXT_SEC * 1000)
}
