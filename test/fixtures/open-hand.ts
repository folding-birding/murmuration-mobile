import type { HandFrame, HandSide } from '../../src/camera/hand/types'

export function openHand(side: HandSide = 'Right'): HandFrame {
  const points = [[.5,.85],[.65,.8],[.75,.75],[.83,.7],[.91,.65],
    [.68,.55],[.72,.4],[.76,.27],[.8,.15],
    [.55,.52],[.55,.34],[.56,.2],[.56,.07],
    [.42,.55],[.4,.37],[.37,.23],[.35,.12],
    [.32,.62],[.25,.49],[.2,.38],[.15,.3]]
  const world = points.map(([x,y]) => ({ x: (side === 'Left' ? 1-x : x) * .25, y: y * .25, z: 0, visibility: 0 }))
  const landmarks = world.map(p => ({ x: .5 + (p.x / .25 - .5) * .45, y: .65 + (p.y / .25 - .5) * .45, z: 0, visibility: 0 }))
  return { landmarks: [landmarks], worldLandmarks: [world], handedness: [[{ categoryName: side, displayName: side, score: .99, index: side === 'Right' ? 0 : 1 }]] }
}
