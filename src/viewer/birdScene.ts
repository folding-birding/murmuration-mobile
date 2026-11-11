import {
  AnimationMixer, Box3, DirectionalLight, FrontSide, Group, HemisphereLight,
  LoadingManager, LoopRepeat, Material, Mesh, MeshStandardMaterial, PerspectiveCamera,
  Scene, SkinnedMesh, SRGBColorSpace, Texture, TextureLoader, Vector3, WebGLRenderer,
} from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import modelUrl from '../assets/models/paper-dove-250622.fbx?url'
import { uiVariables } from '../ui/ui-variable'

// The FBX references an old authoring PNG. Only the worker's generated atlas is used.
class PlaceholderTextureLoader extends TextureLoader {
  override load() { return new Texture<HTMLImageElement>() }
}

export function mountBirdScene(canvas: HTMLCanvasElement, textureUrl: string, onReady: () => void, onError: () => void) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(uiVariables['palette/black'], 0)
  const scene = new Scene()
  const turntable = new Group()
  const centered = new Group()
  turntable.add(centered)
  scene.add(turntable, new HemisphereLight(uiVariables['palette/white'], uiVariables['palette/natural'], 2.2))
  const keyLight = new DirectionalLight(uiVariables['palette/white'], 2)
  keyLight.position.set(3, 5, 4)
  scene.add(keyLight)
  const camera = new PerspectiveCamera(35, 1, 0.1, 1000)
  const resize = () => {
    const size = Math.max(1, canvas.clientWidth)
    renderer.setSize(size, size, false)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  const controller = new AbortController()
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  let model: Group | undefined
  let mixer: AnimationMixer | undefined
  let disposed = false
  let frame = 0
  let previousTime = 0
  let active = true
  function animate(time: number) {
    if (disposed || document.hidden || !active) return
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
    previousTime = time
    mixer?.update(delta)
    renderer.render(scene, camera)
    frame = requestAnimationFrame(animate)
  }
  function visibilityChanged() {
    cancelAnimationFrame(frame)
    previousTime = 0
    if (!document.hidden && mixer && !disposed && active) frame = requestAnimationFrame(animate)
  }
  function dispose() {
    if (disposed) return
    disposed = true
    controller.abort()
    observer.disconnect()
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', visibilityChanged)
    mixer?.stopAllAction()
    if (model) {
      mixer?.uncacheRoot(model)
      model.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose()
        if (object instanceof SkinnedMesh) object.skeleton.dispose()
      })
    }
    materials.forEach((material) => material.dispose())
    textures.forEach((texture) => texture.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
  }

  async function load() {
    const response = await fetch(modelUrl, { signal: controller.signal })
    if (!response.ok) throw new Error('Unable to load bird model')
    const data = await response.arrayBuffer()
    if (disposed) return
    const manager = new LoadingManager()
    manager.addHandler(/.*/, new PlaceholderTextureLoader())
    model = new FBXLoader(manager).parse(data, '')
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material)
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
      }
      // Skinned bounds vary during the wing cycle; the camera already frames the full cycle.
      object.frustumCulled = false
    })
    const clip = model.animations.find((animation) => animation.name.toLowerCase() === 'hover')
    if (!clip) throw new Error('The model has no hover animation')
    const texture = await new TextureLoader().loadAsync(textureUrl)
    if (disposed) { texture.dispose(); return }
    textures.add(texture)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    const paper = new MeshStandardMaterial({ map: texture, side: FrontSide, roughness: 1, metalness: 0, flatShading: true, alphaTest: 0.1 })
    materials.add(paper)
    model.traverse((object) => { if (object instanceof Mesh) object.material = paper })
    centered.add(model)
    mixer = new AnimationMixer(model)
    mixer.clipAction(clip).setLoop(LoopRepeat, Infinity).play()

    // Fit the actual animated mesh, not the FBX rest pose or other animation clips.
    const bounds = new Box3()
    for (let sample = 0; sample < 32; sample++) {
      mixer.setTime(clip.duration * sample / 32)
      model.updateMatrixWorld(true)
      bounds.union(new Box3().setFromObject(model, true))
    }
    centered.position.copy(bounds.getCenter(new Vector3())).negate()
    const radius = bounds.getSize(new Vector3()).length() / 2
    if (!Number.isFinite(radius) || radius <= 0) throw new Error('Invalid bird geometry')
    const distance = radius / Math.sin(camera.fov * Math.PI / 360) * 1.08
    camera.position.set(0, distance * 0.12, distance)
    camera.near = Math.max(0.01, distance - radius * 2)
    camera.far = distance + radius * 3
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    mixer.setTime(0)
    document.addEventListener('visibilitychange', visibilityChanged)
    visibilityChanged()
    onReady()
  }
  void load().catch(() => {
    if (disposed) return
    dispose()
    onError()
  })
  return { dispose, setActive: (value: boolean) => {
    if (active === value || disposed) return
    active = value
    visibilityChanged()
  }, setYaw: (radians: number) => { turntable.rotation.y = radians } }
}
