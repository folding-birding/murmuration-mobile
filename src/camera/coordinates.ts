export type Vector3 = { x: number; y: number; z: number }

export function coverTransform(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const scaledWidth = sourceWidth * scale, scaledHeight = sourceHeight * scale
  return { width: scaledWidth, height: scaledHeight, x: (width - scaledWidth) / 2, y: (height - scaledHeight) / 2 }
}
