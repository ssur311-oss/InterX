import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RotateCcw } from 'lucide-react'
import { buildMoni } from './moni/buildMoni'
import { frameCamera, prepareDecorFade } from './moni/moniFrame'
import { createMotion, step, trigger, type Motion, type MoniState } from './moni/moniMotion'

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
  /** 화면 위치·크기를 옮기는 중 (그동안 커서 목표를 붙잡아 둔다) */
  moving?: boolean
  className?: string
}

const MAX_DPR = 1.75
const MAX_DT = 0.05
// 커질 때 그리기 버퍼를 넉넉히 잡아 전환 중 재할당 횟수를 줄인다
const GROW = 1.35
// 크기 변화가 이만큼 멈추면 버퍼를 최종 크기에 맞춘다
const SETTLE_MS = 180
// 도착 후 새 위치 기준 커서 목표로 넘어가는 시간
const HANDOFF_MS = 350
// 모니터 윗부분(화면 위 테두리·윗면)을 '머리'로 본다. 모니터 몸통 기준 높이, 몸통 꼭대기는 1.79
const HEAD_ZONE_Y = 1.55
// 머리 위에서 좌우로 이만큼(px) 문지르면 쓰다듬기. 잠깐 멈추면 처음부터 다시 잰다
const PET_PX = 80
const PET_GAP_MS = 300
// 이 시간 안에 이만큼 누르면 어지러워한다
const DIZZY_CLICKS = 4
const DIZZY_WINDOW_MS = 1500

// 개발 모드 확인용 숫자 (재마운트·renderer 재생성·루프 중복 확인)
const devStats = { setups: 0, renderers: 0, loops: 0, reallocs: 0, resizes: 0 }

/**
 * 실시간 3D 컴퓨터 캐릭터 '모니'. 보이기만 한다:
 * 데이터 저장·증빙 상태 변경·슬랙 발송 같은 일은 절대 하지 않는다 (RULE.md 0장)
 */
export function AiAssistantCharacter({ state = 'idle', paused = false, pointerTracking = true, forceIdle = false, replay = 0, showStatus = true, moving = false, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const statusEl = useRef<HTMLSpanElement>(null)
  // 매 프레임 setState를 하지 않도록 최신 props를 ref로 넘긴다
  const props = useRef({ state, paused, pointerTracking, forceIdle, replay, moving })
  useLayoutEffect(() => {
    props.current = { state, paused, pointerTracking, forceIdle, replay, moving }
  }, [state, paused, pointerTracking, forceIdle, replay, moving])
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
    devStats.setups++
    devStats.renderers++
    if (import.meta.env.DEV) console.debug('[moni] renderer 생성', { ...devStats })
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
    // 버퍼가 보이는 영역보다 클 수 있어 왼쪽 위에 붙이고, 넘치는 부분은 상자가 잘라낸다
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.touchAction = 'pan-y' // 터치 스크롤을 막지 않는다
    el.prepend(canvas)

    const moni = buildMoni()
    const decorFade = prepareDecorFade(moni)
    const motion: Motion = createMotion(performance.now())
    let dirty = true
    let visible = true
    let frame = 0
    let previous = performance.now()
    let viewW = 0
    let viewH = 0
    let bufW = 0
    let bufH = 0
    let settleTimer = 0

    // 그리기 버퍼(해상도)와 화면에 보이는 크기를 나눠 관리한다.
    // 예전에는 크기가 바뀔 때마다 버퍼를 새로 만들었는데, 그러면 캔버스가 지워진 채로 화면에 나가
    // 전환 내내 모니가 사라져 보였다. 이제 전환 중에는 버퍼를 키우기만 하고(넉넉히), 보이는 영역만 그린다
    const fitBuffer = (exact: boolean) => {
      let w = bufW
      let h = bufH
      if (exact) {
        w = viewW
        h = viewH
      } else if (viewW > bufW || viewH > bufH) {
        w = Math.max(bufW, Math.ceil(viewW * GROW))
        h = Math.max(bufH, Math.ceil(viewH * GROW))
      }
      if (w !== bufW || h !== bufH) {
        renderer.setSize(w, h, false)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        bufW = w
        bufH = h
        devStats.reallocs++
      }
      // WebGL은 아래쪽이 기준이라, 왼쪽 위 영역을 쓰려면 y를 위로 올린다
      renderer.setViewport(0, bufH - viewH, viewW, viewH)
    }
    const draw = () => {
      renderer.render(moni.scene, moni.camera)
      dirty = false
    }
    const resize = (width: number, height: number) => {
      if (!width || !height) return
      devStats.resizes++
      viewW = width
      viewH = height
      // 처음에는 정확한 크기로
      fitBuffer(bufW === 0)
      decorFade.set(frameCamera(moni, width, height))
      // 크기가 바뀐 바로 그 프레임에 그려야 빈 화면이 나가지 않는다
      draw()
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (bufW === viewW && bufH === viewH) return
        fitBuffer(true)
        draw()
      }, SETTLE_MS)
    }
    const ro = new ResizeObserver(() => resize(el.clientWidth, el.clientHeight))
    ro.observe(el)
    resize(el.clientWidth, el.clientHeight)

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting
    })
    io.observe(el)

    // 앱 창 어디서든 커서를 받되, 캐릭터 중심 기준으로 [-1, 1]
    const aimAt = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      const sx = Math.max(r.width * 0.65, 320)
      const sy = Math.max(r.height * 0.65, 260)
      return {
        x: THREE.MathUtils.clamp((cx - r.left - r.width / 2) / sx, -1, 1),
        y: THREE.MathUtils.clamp((cy - r.top - r.height / 2) / sy, -1, 1),
      }
    }
    // 커서가 모니 머리 위에 있는지: 화면 좌표 → 3D 광선으로 모니터에 닿는 점의 높이를 본다
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const local = new THREE.Vector3()
    const onHead = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, moni.camera)
      const hit = raycaster.intersectObject(moni.monitorGroup, true)[0]
      if (!hit) return false
      moni.monitorGroup.worldToLocal(local.copy(hit.point))
      return local.y > HEAD_ZONE_Y
    }
    const stroke = { x: 0, dist: 0, at: 0 }
    let clicks: number[] = []
    // 쓰다듬기·여러 번 누르기는 보기만 하는 반응이라 캐릭터 안에서 바로 처리한다
    const react = (e: PointerEvent, now: number) => {
      if (e.type === 'pointerdown') {
        const r = el.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return
        clicks = [...clicks.filter((c) => now - c < DIZZY_WINDOW_MS), now]
        if (clicks.length >= DIZZY_CLICKS) {
          clicks = []
          trigger(motion, 'dizzy')
        }
        return
      }
      if (!onHead(e.clientX, e.clientY)) {
        stroke.dist = 0
        return
      }
      stroke.dist = now - stroke.at > PET_GAP_MS ? 0 : stroke.dist + Math.abs(e.clientX - stroke.x)
      stroke.x = e.clientX
      stroke.at = now
      if (stroke.dist > PET_PX && motion.reaction !== 'dizzy') trigger(motion, 'petted')
    }

    let lastClient: { x: number; y: number } | null = null
    let wasMoving = false
    // 도착 직후 새 위치 기준 목표로 천천히 넘어가는 중이면 값이 있다
    let handoff: { from: { x: number; y: number }; to: { x: number; y: number }; start: number } | null = null
    const onPointer = (e: PointerEvent) => {
      const now = performance.now()
      lastClient = { x: e.clientX, y: e.clientY }
      motion.pointerActive = true
      motion.lastInputMs = now
      if (!props.current.paused) react(e, now)
      // 상자가 움직이는 동안에는 기준점이 계속 바뀌어 고개가 튀므로 목표를 붙잡아 둔다
      if (props.current.moving) return
      const aim = aimAt(e.clientX, e.clientY)
      if (handoff) handoff.to = aim
      else {
        motion.pointer.x = aim.x
        motion.pointer.y = aim.y
      }
    }
    // 창 밖으로 나가면 마지막 위치에 멈추지 않고 정면으로 돌아온다
    const onLeave = () => {
      handoff = null
      lastClient = null
      motion.pointerActive = false
      motion.pointer.x = 0
      motion.pointer.y = 0
    }
    // 상담 창에 글을 쓰는 동안 졸지 않도록 키보드 입력도 깨어 있는 신호로 본다
    const onKey = () => {
      motion.lastInputMs = performance.now()
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('keydown', onKey, { passive: true })
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
      // 도착하면 마지막 커서 위치를 새 기준으로 다시 계산해 부드럽게 넘어간다
      if (wasMoving && !p.moving && lastClient && motion.pointerActive) {
        handoff = { from: { ...motion.pointer }, to: aimAt(lastClient.x, lastClient.y), start: now }
      }
      wasMoving = p.moving
      if (handoff) {
        const t = Math.min(1, (now - handoff.start) / HANDOFF_MS)
        const e = t * t * (3 - 2 * t)
        motion.pointer.x = THREE.MathUtils.lerp(handoff.from.x, handoff.to.x, e)
        motion.pointer.y = THREE.MathUtils.lerp(handoff.from.y, handoff.to.y, e)
        if (t >= 1) handoff = null
      }
      if (p.paused) {
        motion.label = '움직임 멈춤'
      } else {
        step(motion, moni, dt, { state: p.state, replay: p.replay, pointerTracking: p.pointerTracking, forceIdle: p.forceIdle, nowMs: now })
        dirty = true
      }
      if (statusEl.current && statusEl.current.textContent !== motion.label) statusEl.current.textContent = motion.label
      if (dirty) draw()
    }
    frame = requestAnimationFrame(animate)
    devStats.loops++

    // 확인용 읽기 전용 스냅샷 (개발 모드만, 데이터·네트워크 영향 없음)
    const w = window as unknown as { __moni?: () => unknown }
    if (import.meta.env.DEV) {
      w.__moni = () => ({
        label: motion.label, time: motion.time, paused: props.current.paused,
        head: moni.headPivot.rotation.toArray().slice(0, 3), eyes: [motion.eyeX, motion.eyeY], logo: motion.logo,
        pointer: { ...motion.pointer }, buffer: [bufW, bufH], view: [viewW, viewH], stats: { ...devStats },
      })
    }

    return () => {
      cancelAnimationFrame(frame)
      devStats.loops--
      window.clearTimeout(settleTimer)
      if (import.meta.env.DEV) console.debug('[moni] 정리', { ...devStats })
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      canvas.removeEventListener('webglcontextlost', onLost)
      moni.dispose()
      decorFade.dispose()
      renderer.dispose()
      canvas.remove()
      if (import.meta.env.DEV) delete w.__moni
    }
  }, [attempt])

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`}>
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
