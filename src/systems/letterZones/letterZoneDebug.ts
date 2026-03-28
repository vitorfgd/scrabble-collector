import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three'

const MAP = 20

/**
 * Optional overlay: split line + map perimeter for top-down readability.
 * Parent `visible` toggles the whole overlay.
 */
export function createLetterZoneBoundaryDebug(): Group {
  const group = new Group()
  group.name = 'letterZoneDebug'

  const y = 0.07
  const splitMat = new LineBasicMaterial({
    color: 0xff3cac,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
  })
  const split = new Line(
    new BufferGeometry().setFromPoints([
      new Vector3(0, y, -MAP),
      new Vector3(0, y, MAP),
    ]),
    splitMat,
  )
  group.add(split)

  const borderMat = new LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    depthTest: true,
  })
  const corners = [
    new Vector3(-MAP, y, -MAP),
    new Vector3(MAP, y, -MAP),
    new Vector3(MAP, y, MAP),
    new Vector3(-MAP, y, MAP),
    new Vector3(-MAP, y, -MAP),
  ]
  const border = new Line(new BufferGeometry().setFromPoints(corners), borderMat)
  group.add(border)

  group.visible = false
  return group
}
