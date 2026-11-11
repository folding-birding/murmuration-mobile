import { uiVariables } from '../../ui/ui-variable'
import { coverTransform } from '../coordinates'
import type { HandFrame } from '../hand/types'

const chains = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]]

export function drawHands(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: HandFrame) {
  const context = canvas.getContext('2d')
  if (!context || !video.videoWidth || !video.videoHeight) return
  const width = canvas.clientWidth, height = canvas.clientHeight
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const pixelsWide = Math.round(width * ratio), pixelsHigh = Math.round(height * ratio)
  if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
    canvas.width = pixelsWide
    canvas.height = pixelsHigh
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const fit = coverTransform(video.videoWidth, video.videoHeight, width, height)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  frame.landmarks.forEach((hand, handIndex) => {
    const points = hand.map(point => ({ x: fit.x + point.x * fit.width, y: fit.y + point.y * fit.height }))
    context.beginPath()
    for (const chain of chains) {
      chain.forEach((index, step) => {
        const point = points[index]
        if (step === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
      })
    }
    context.strokeStyle = uiVariables['palette/white']
    context.lineWidth = 2
    context.stroke()
    const world = frame.worldLandmarks[handIndex]
    points.forEach((point, index) => {
      const depth = world ? world[index].z - world[0].z : 0
      const radius = Math.max(1, Math.min(8, 8 - (depth + 0.15) / 0.3 * 7))
      context.beginPath()
      context.arc(point.x, point.y, radius, 0, Math.PI * 2)
      context.fillStyle = uiVariables['palette/white']
      context.fill()
    })
  })
}
