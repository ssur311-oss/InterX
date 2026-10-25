import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// 모니: 아이보리색 1990년대 CRT 컴퓨터. 모델 파일 없이 기본 도형으로 만든다 (design/assistant-demo/character.js 기준)
// 본체·바닥·마우스는 고정, headPivot(연결부)만 돈다.

export const HEAD_BASE_Y = 0.79
export const EYES_BASE_Y = 0.96
// 모니터가 본체를 뚫는지 검사할 때 쓰는 높이 (본체 위 테두리 / 가운데 받침 윗면)
export const TRIM_TOP = 0.625
export const PEDESTAL_TOP = 0.745
export const PEDESTAL_HALF = { x: 0.625, zMin: -0.53, zMax: 0.37 }

export type Moni = {
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  headPivot: THREE.Group
  monitorGroup: THREE.Group
  eyesGroup: THREE.Group
  eyes: THREE.Mesh[]
  smiles: THREE.Mesh[]
  logo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  decor: THREE.Group
  dispose: () => void
}

/** interX 로고를 화면용 텍스처로 그린다 (대기 중에 잠깐 띄움) */
function logoTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const ctx = canvas.getContext('2d')!
  ctx.font = '800 120px "Pretendard Variable", Pretendard, sans-serif'
  ctx.textBaseline = 'middle'
  const inter = ctx.measureText('inter').width
  const x = ctx.measureText('X').width
  const left = (canvas.width - inter - x) / 2
  ctx.fillStyle = '#ffffff'
  ctx.fillText('inter', left, 100)
  ctx.fillStyle = '#ff9a4a'
  ctx.fillText('X', left + inter, 100)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function buildMoni(): Moni {
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 60)
  camera.position.set(4.3, 3.4, 7)
  camera.lookAt(0.3, 1.05, 0)

  scene.add(new THREE.HemisphereLight(0xffffff, 0xaba5ba, 3))
  const key = new THREE.DirectionalLight(0xfff5e5, 4.4)
  key.position.set(-3, 7, 5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 })
  key.shadow.normalBias = 0.035
  key.shadow.radius = 4
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 1.2)
  fill.position.set(5, 3, -4)
  scene.add(fill)

  const ivory = new THREE.MeshStandardMaterial({ color: 0xe0d9c5, roughness: 0.32, metalness: 0.04 })
  const trim = new THREE.MeshStandardMaterial({ color: 0xaaa797, roughness: 0.55 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x242735, roughness: 0.24, metalness: 0.15 })
  const green = new THREE.MeshBasicMaterial({ color: 0x6cff16, toneMapped: false })
  const red = new THREE.MeshStandardMaterial({ color: 0xd64535, roughness: 0.4 })

  const rounded = (w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const face = (w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const s = new THREE.Shape()
    const l = -w / 2
    const b = -h / 2
    s.moveTo(l + r, b)
    s.lineTo(l + w - r, b)
    s.quadraticCurveTo(l + w, b, l + w, b + r)
    s.lineTo(l + w, b + h - r)
    s.quadraticCurveTo(l + w, b + h, l + w - r, b + h)
    s.lineTo(l + r, b + h)
    s.quadraticCurveTo(l, b + h, l, b + h - r)
    s.lineTo(l, b + r)
    s.quadraticCurveTo(l, b, l + r, b)
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, steps: 1, curveSegments: 16 })
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }

  // 바닥: 유리 카드 배경이 비치도록 그림자만 받는다
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const computer = new THREE.Group()
  computer.position.x = -0.4
  scene.add(computer)

  // bodyGroup: 본체 (고정)
  const bodyGroup = new THREE.Group()
  computer.add(bodyGroup)
  rounded(2.55, 0.5, 1.85, 0.12, ivory, 0, 0.32, 0, bodyGroup)
  rounded(2.32, 0.07, 1.63, 0.03, trim, 0, 0.59, 0, bodyGroup)
  rounded(1.25, 0.13, 0.9, 0.07, ivory, 0, 0.68, -0.08, bodyGroup)
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), trim)
  joint.scale.set(1, 0.7, 1)
  joint.position.set(0, 0.77, -0.08)
  bodyGroup.add(joint)
  // 앞면: 디스크 슬롯, 붉은 배출 버튼, 전원 표시등 / 옆면 통풍구
  rounded(0.62, 0.18, 0.027, 0.025, trim, 0.61, 0.32, 0.936, bodyGroup)
  rounded(0.49, 0.025, 0.035, 0.006, dark, 0.61, 0.35, 0.954, bodyGroup)
  rounded(0.12, 0.035, 0.04, 0.01, red, 0.79, 0.287, 0.955, bodyGroup)
  rounded(0.035, 0.035, 0.02, 0.01, green, -0.94, 0.29, 0.94, bodyGroup)
  for (let i = 0; i < 5; i++) rounded(0.024, 0.18, 0.055, 0.01, trim, -1.277, 0.34, 0.35 - i * 0.16, bodyGroup)

  // headPivot: 회전축은 모니터 아래 연결부
  const headPivot = new THREE.Group()
  headPivot.position.set(0, HEAD_BASE_Y, -0.08)
  computer.add(headPivot)
  const monitorGroup = new THREE.Group()
  headPivot.add(monitorGroup)
  rounded(2.13, 1.78, 1.25, 0.23, ivory, 0, 0.9, 0, monitorGroup)
  face(1.83, 1.4, 0.05, 0.2, trim, 0, 0.91, 0.63, monitorGroup)
  face(1.67, 1.25, 0.04, 0.22, dark, 0, 0.92, 0.705, monitorGroup)
  const sheen = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055, depthWrite: false })
  rounded(1.32, 0.11, 0.006, 0.045, sheen, -0.04, 1.39, 0.77, monitorGroup).rotation.z = 0.045
  for (let i = 0; i < 5; i++) rounded(0.018, 0.31, 0.045, 0.012, trim, 1.068, 0.9, -0.33 + i * 0.12, monitorGroup)

  // eyesGroup: 초록 캡슐 눈 + 웃는 눈(아치)
  const eyesGroup = new THREE.Group()
  eyesGroup.position.set(0, EYES_BASE_Y, 0.787)
  monitorGroup.add(eyesGroup)
  const eyes: THREE.Mesh[] = []
  const smiles: THREE.Mesh[] = []
  for (const x of [-0.34, 0.34]) {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.27, 8, 16), green)
    eye.position.set(x, 0, 0)
    eye.scale.z = 0.3
    eyesGroup.add(eye)
    eyes.push(eye)
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x - 0.11, -0.015, 0.01), new THREE.Vector3(x, 0.16, 0.01), new THREE.Vector3(x + 0.11, -0.015, 0.01))
    const smile = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.027, 8, false), green)
    smile.visible = false
    eyesGroup.add(smile)
    smiles.push(smile)
  }

  // 대기 중에 잠깐 띄우는 interX 로고 (눈 대신)
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.49),
    new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
  )
  logo.position.set(0, 0.93, 0.79)
  monitorGroup.add(logo)

  // 곁의 마우스·화분 (좁은 화면에서는 숨김)
  const decor = new THREE.Group()
  scene.add(decor)
  const mouse = new THREE.Group()
  mouse.position.set(1.15, 0.13, 1.32)
  mouse.rotation.y = -0.24
  decor.add(mouse)
  const mouseBody = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), ivory)
  mouseBody.scale.set(0.27, 0.18, 0.4)
  mouseBody.castShadow = true
  mouse.add(mouseBody)
  rounded(0.012, 0.012, 0.21, 0.005, trim, 0, 0.167, -0.1, mouse)
  const cablePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.85, 0.12, -0.2), new THREE.Vector3(1.8, 0.04, -0.1), new THREE.Vector3(2, 0.04, 0.5),
    new THREE.Vector3(0.85, 0.04, 0.8), new THREE.Vector3(1.23, 0.08, 1.02),
  ])
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cablePath, 60, 0.018, 8, false), ivory)
  cable.castShadow = true
  decor.add(cable)
  const plant = new THREE.Group()
  plant.position.set(1.6, 0, -0.55)
  decor.add(plant)
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 20), new THREE.MeshStandardMaterial({ color: 0xf2f0e7, roughness: 0.35 }))
  pot.position.y = 0.26
  pot.scale.y = 0.87
  pot.castShadow = true
  plant.add(pot)
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 32), new THREE.MeshStandardMaterial({ color: 0x393e28, roughness: 1 }))
  soil.position.y = 0.49
  plant.add(soil)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x449724, roughness: 0.4 })
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), leafMat)
    leaf.scale.set(0.1, 0.31, 0.045)
    leaf.position.set(Math.cos(a) * 0.15, 0.65 + (i % 2) * 0.04, Math.sin(a) * 0.15)
    leaf.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7)
    leaf.castShadow = true
    plant.add(leaf)
  }

  const dispose = () => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
      for (const m of mats) {
        ;(m as THREE.MeshBasicMaterial).map?.dispose()
        m.dispose()
      }
    })
  }

  return { scene, camera, headPivot, monitorGroup, eyesGroup, eyes, smiles, logo, decor, dispose }
}
