import * as THREE from 'three'
import type { Moni } from './buildMoni'

// 넓을 때는 마우스·화분까지 보여주고, 좁을 때는 숨기고 본체를 크게.
// 예전에는 420px에서 딱 끊어 바꿔서 크기 전환 중간에 장식이 툭 사라지고 화면이 한 번 튀었다.
// 이제는 이 구간에서 장식은 서서히 투명해지고 카메라 범위도 연속으로 바뀐다
const NARROW = 360
const WIDE = 460

/** 장식 재질을 따로 복사해 투명도를 조절할 수 있게 한다 (본체와 같은 재질을 쓰므로 복사 필요) */
export function prepareDecorFade(moni: Moni) {
  const originals: THREE.Material[] = []
  const fading: THREE.Material[] = []
  const casters: THREE.Object3D[] = []
  moni.decor.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (mesh.castShadow) casters.push(mesh)
    const original = mesh.material as THREE.Material
    const copy = original.clone()
    // 처음부터 투명 처리로 두어야 전환 중에 셰이더를 다시 만들지 않는다 (멈칫 방지)
    copy.transparent = true
    mesh.material = copy
    originals.push(original)
    fading.push(copy)
  })
  let current = -1
  return {
    set(k: number) {
      if (k === current) return
      current = k
      moni.decor.visible = k > 0.01
      for (const m of fading) m.opacity = k
      // 그림자는 투명도를 못 따라가므로 절반쯤 흐려졌을 때 끈다
      for (const o of casters) o.castShadow = k > 0.5
    },
    dispose() {
      for (const m of originals) m.dispose()
    },
  }
}

/** 화면 크기(CSS px)에 맞춰 카메라 범위를 정한다. 반환값: 장식 표시 정도 0~1 */
export function frameCamera(moni: Moni, width: number, height: number): number {
  const k = THREE.MathUtils.smoothstep(width, NARROW, WIDE)
  const aspect = width / height
  const halfH = THREE.MathUtils.lerp(2.2, 2.3, k)
  const needW = THREE.MathUtils.lerp(2.2, 3.5, k)
  const h = Math.max(halfH, needW / aspect)
  const cam = moni.camera
  cam.left = -h * aspect
  cam.right = h * aspect
  cam.top = h
  cam.bottom = -h
  cam.updateProjectionMatrix()
  // 화분·마우스가 아니라 모니(모니터) 자체가 화면 가운데 오도록 카메라 범위를 옮긴다
  const center = new THREE.Vector3(-0.4, 1.1, -0.08).project(cam)
  const shiftX = center.x * h * aspect
  const shiftY = center.y * h
  cam.left += shiftX
  cam.right += shiftX
  cam.top += shiftY
  cam.bottom += shiftY
  cam.updateProjectionMatrix()
  return k
}
