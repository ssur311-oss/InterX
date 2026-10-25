import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RotateCcw } from 'lucide-react'
import { buildMoni } from './moni/buildMoni'
import { createMotion, step, type Motion, type MoniState } from './moni/moniMotion'

export type { MoniState }

type Props = {
  state?: MoniState
  paused?: boolean
  pointerTracking?: boolean
  /** 데모용: 커서와 상관없이 혼자 놀기 */
  forceIdle?: boolean
  /** 숫자를 바꾸면 같은 동작을 처음부터 다시 */
  replay?: number
  /** 상태 글자(텍스트)를 캔버스 위에 보여줄지 */
  showStatus?: boolean
  className?: string
}

const MAX_DPR = 1.75
const MAX_DT = 0.05

/**
 * 실시간 3D 컴퓨터 캐릭터 '모니'. 보이기만 한다:
 * 데이터 저장·증빙 상태 변경·슬랙 발송 같은 일은 절대 하지 않는다 (RULE.md 0장)
 */
export function AiAssistantCharacter({ state = 'idle', paused = false, pointerTracking = true, forceIdle = false, replay = 0, showStatus = true, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const statusEl = useRef<HTMLSpanElement>(null)
  // 매 프레임 setState를 하지 않도록 최신 props를 ref로 넘긴다
  const props = useRef({ state, paused, pointerTracking, forceIdle, replay })
  useLayoutEffect(() => {
    props.current = { state, paused, pointerTracking, forceIdle, replay }
  }, [state, paused, pointerTracking, forceIdle, replay])
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      setFailed(true)
      return
    }
    setFailed(false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    const canvas = renderer.domElement
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '커서를 바라보는 아이보리색 3D 컴퓨터 캐릭터 모니')
    canvas.style.display = 'block'
    canvas.style.touchAction = 'pan-y' // 터치 스크롤을 막지 않는다
    el.prepend(canvas)

    const moni = buildMoni()
    const motion: Motion = createMotion(performance.now())
    let dirty = true
    let visible = true
    let frame = 0
    let previous = performance.now()

    // 컨테이너 크기에 맞춰 카메라 범위 조정. 좁으면 장식(마우스·화분)을 숨기고 본체를 크게
    const resize = () => {
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const wide = width >= 420
      moni.decor.visible = wide
      const aspect = width / height
      const halfH = wide ? 2.3 : 2.2
      const needW = wide ? 3.5 : 2.2
      const h = Math.max(halfH, needW / aspect)
      moni.camera.left = -h * aspect
      moni.camera.right = h * aspect
      moni.camera.top = h
      moni.camera.bottom = -h
      moni.camera.updateProjectionMatrix()
      // 화분·마우스가 아니라 모니(모니터) 자체가 화면 가운데 오도록 카메라 범위를 옮긴다
      const center = new THREE.Vector3(-0.4, 1.1, -0.08).project(moni.camera)
      const shiftX = center.x * h * aspect
      const shiftY = center.y * h
      moni.camera.left += shiftX
      moni.camera.right += shiftX
      moni.camera.top += shiftY
      moni.camera.bottom += shiftY
      moni.camera.updateProjectionMatrix()
      dirty = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
    })
    io.observe(el)

    // 앱 창 어디서든 커서를 받되, 캐릭터 중심 기준으로 [-1, 1]
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const sx = Math.max(r.width * 0.65, 320)
      const sy = Math.max(r.height * 0.65, 260)
      motion.pointer.x = THREE.MathUtils.clamp((e.clientX - r.left - r.width / 2) / sx, -1, 1)
      motion.pointer.y = THREE.MathUtils.clamp((e.clientY - r.top - r.height / 2) / sy, -1, 1)
      motion.pointerActive = true
      motion.lastInputMs = performance.now()
    }
    // 창 밖으로 나가면 마지막 위치에 멈추지 않고 정면으로 돌아온다
    const onLeave = () => {
      motion.pointerActive = false
      motion.pointer.x = 0
      motion.pointer.y = 0
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    const onLost = (e: Event) => {
      e.preventDefault()
      setFailed(true)
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const dt = Math.min((now - previous) / 1000, MAX_DT)
      previous = now
      // 화면 밖·다른 탭이면 렌더링과 모션 시간을 멈춘다
      if (document.hidden || !visible) return
      const p = props.current
      if (p.paused) {
        motion.label = '움직임 멈춤'
      } else {
        step(motion, moni, dt, { state: p.state, replay: p.replay, pointerTracking: p.pointerTracking, forceIdle: p.forceIdle, nowMs: now })
        dirty = true
      }
      if (statusEl.current && statusEl.current.textContent !== motion.label) statusEl.current.textContent = motion.label
      if (dirty) {
        renderer.render(moni.scene, moni.camera)
        dirty = false
      }
    }
    frame = requestAnimationFrame(animate)

    // 확인용 읽기 전용 스냅샷 (개발 모드만, 데이터·네트워크 영향 없음)
    const w = window as unknown as { __moni?: () => unknown }
    if (import.meta.env.DEV) {
      w.__moni = () => ({
        label: motion.label, time: motion.time, paused: props.current.paused,
        head: moni.headPivot.rotation.toArray().slice(0, 3), eyes: [motion.eyeX, motion.eyeY], logo: motion.logo,
      })
    }

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      canvas.removeEventListener('webglcontextlost', onLost)
      moni.dispose()
      renderer.dispose()
      canvas.remove()
      if (import.meta.env.DEV) delete w.__moni
    }
  }, [attempt])

  return (
    <div ref={box} className={`relative ${className}`}>
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-body">3D 캐릭터를 불러오지 못했어요. 다른 기능은 그대로 쓸 수 있어요.</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="flex min-h-11 items-center gap-1 rounded-lg px-3 font-medium text-brand hover:bg-white/70">
            <RotateCcw aria-hidden size={16} /> 다시 시도
          </button>
        </div>
      )}
      {showStatus && !failed && (
        <span ref={statusEl} aria-live="polite"
          className="pointer-events-none absolute top-3 right-3 rounded-full bg-white/85 px-3 py-1 text-[13px] font-medium text-body shadow-sm" />
      )}
    </div>
  )
}
