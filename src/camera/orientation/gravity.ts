import type { Vector3 } from '../coordinates'

export function cameraUp(beta: number, gamma: number, screenAngle: number, frontCamera: boolean): Vector3 {
  const b = beta * Math.PI / 180, g = gamma * Math.PI / 180, a = screenAngle * Math.PI / 180
  // Third row of the Device Orientation Z-X-Y rotation matrix: world up in device coordinates.
  const dx = -Math.cos(b) * Math.sin(g), dy = Math.sin(b), dz = Math.cos(b) * Math.cos(g)
  const sx = dx * Math.cos(a) - dy * Math.sin(a), sy = dx * Math.sin(a) + dy * Math.cos(a)
  // Camera landmarks are unmirrored, with image Y down and Z away from the lens.
  return { x: sx * (frontCamera ? -1 : 1), y: -sy, z: dz * (frontCamera ? 1 : -1) }
}
