import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { AiAssistantCharacter, type MoniState } from './AiAssistantCharacter'
import { FeaturePanel } from './FeaturePanel'
import { FEATURES, type FeatureKey } from './features'

type Phase = 'idle' | 'menu' | 'feature'
type Rect = { left: number; top: number; width: number; height: number }

const MOVE_MS = 460
const SMALL = { width: 232, height: 200, gap: 16 }

/**
 * 모니 상자 위치·크기 (무대 안 CSS px).
 * 큰 상태와 작은 상태를 같은 네 값(left·top·width·height)으로 나타내야 한 번의 전환으로 이어진다.
 * 예전에는 큰 상태는 top/left 50% + translate, 작은 상태는 right/bottom이라 위치가 중간에 툭 바뀌었다
 */
function moniRect(small: boolean, W: number, H: number): Rect {
  if (small) return { left: W - SMALL.gap - SMALL.width, top: H - SMALL.gap - SMALL.height, width: SMALL.width, height: SMALL.height }
  // 기존 화면 비율 그대로: 휴대폰은 94%×44%, 640px 이상은 최대 600×380
  const sm = window.matchMedia('(min-width: 640px)').matches
  const width = sm ? Math.min(600, W * 0.94) : W * 0.94
  const height = sm ? Math.min(380, H * 0.58) : H * 0.44
  return { left: (W - width) / 2, top: H / 2 - height * (sm ? 0.38 : 0.52), width, height }
}

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

/**
 * 체크메이트 모니 무대: 모니를 누르면 기능 버튼이 펼쳐지고, 말풍선이 설명해 준다.
 * 기능을 고르면 모니는 오른쪽 아래로 작아지고 작업 화면이 열린다.
 * 작업 결과(생각 중·완료·오류)에 맞춰 표정이 바뀐다. 저장·발송은 작업 화면의 관리자 버튼으로만.
 */
export function AiAssistantPanel() {
  const reduced = usePrefersReducedMotion()
  // 기기에서 '움직임 줄이기'를 켠 사람에게는 멈춘 채로 보여준다
  const paused = reduced
  const [phase, setPhase] = useState<Phase>('idle')
  const [picked, setPicked] = useState<FeatureKey | null>(null)
  const [hover, setHover] = useState(false)
  const [mood, setMood] = useState<MoniState>('idle')
  const moodTimer = useRef<number | undefined>(undefined)

  // 끄덕임·완료처럼 한 번 하는 동작은 끝나면 기본으로 돌아온다
  const react = useCallback((next: MoniState, ms?: number) => {
    window.clearTimeout(moodTimer.current)
    setMood(next)
    if (ms) moodTimer.current = window.setTimeout(() => setMood('idle'), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(moodTimer.current), [])

  // 무대 크기를 재서 모니 상자 위치를 px로 계산한다 (창 크기가 바뀌면 다시 잼)
  const stage = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => setStageSize((cur) => (cur && cur.w === el.clientWidth && cur.h === el.clientHeight ? cur : { w: el.clientWidth, h: el.clientHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 크기 전환 중인지. 이전 전환의 늦은 완료가 새 전환을 덮어쓰지 않도록 번호로 확인한다
  const [moving, setMoving] = useState(false)
  const moveToken = useRef(0)
  const moveTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(moveTimer.current), [])
  function changePhase(next: Phase) {
    if (!reduced && (next === 'feature') !== (phase === 'feature')) {
      const token = ++moveToken.current
      setMoving(true)
      window.clearTimeout(moveTimer.current)
      moveTimer.current = window.setTimeout(() => {
        if (moveToken.current === token) setMoving(false)
      }, MOVE_MS + 60)
    }
    // 작업 화면을 닫으면 끌어다 놓은 파일도 잊는다 (다시 열 때 같은 파일을 또 읽지 않게)
    if (next !== 'feature') setDropped(null)
    setPhase(next)
  }

  const small = phase === 'feature'
  const rect = stageSize ? moniRect(small, stageSize.w, stageSize.h) : null
  // 전환 중에만 움직임을 켠다 (창 크기를 바꿀 때는 바로 따라가게)
  const boxStyle: CSSProperties | undefined = rect ? {
    ...rect,
    transition: moving ? ['left', 'top', 'width', 'height'].map((p) => `${p} ${MOVE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`).join(', ') : 'none',
  } : undefined
  // 파일을 끌어다 놓으면 모니를 누르지 않아도 '증빙 서류 올리기'가 열리고 바로 읽기 시작한다.
  // 저장은 그 화면에서 확인한 뒤 관리자 버튼으로만 (RULE.md 0장)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const [dropped, setDropped] = useState<{ id: number; files: File[] } | null>(null)
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files')
  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current++
    setDragging(true)
  }
  function onDragOver(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  // 안쪽 요소를 지날 때마다 leave가 생기므로 들어온 횟수로 센다
  function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (!dragDepth.current) setDragging(false)
  }
  function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = [...e.dataTransfer.files]
    if (!files.length) return
    setPicked('receipt')
    changePhase('feature')
    setDropped({ id: Date.now(), files })
  }

  const feature = FEATURES.find((f) => f.key === picked)
  // 상태 우선순위: 일하는 중 > 파일을 끌고 옴 > 작업 결과(mood) > 마우스를 올려 둠(listening) > 기본
  const working = mood === 'thinking' || mood === 'reading'
  const state: MoniState = dragging && !working ? 'ready' : mood !== 'idle' ? mood : hover && !small ? 'listening' : 'idle'

  function onCharacterClick() {
    if (phase === 'menu') {
      changePhase('idle')
      setPicked(null)
      return
    }
    changePhase('menu')
    react('greeting', 2400)
  }

  function pick(key: FeatureKey) {
    setPicked(key)
    react('speaking', 900)
  }

  return (
    <div ref={stage} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`glass relative h-[640px] overflow-hidden rounded-3xl md:h-auto md:min-h-0 md:flex-1 ${dragging ? 'ring-4 ring-brand/40 ring-inset' : ''}`}>
      {small && picked && (
        <div className="absolute inset-4 right-4 bottom-4 md:right-64">
          <FeaturePanel feature={picked} onBack={() => changePhase('menu')} onMood={react} incoming={dropped} />
        </div>
      )}

      {/* 모니: 평소엔 가운데 크게, 작업 화면이 열리면 오른쪽 아래로 작게.
          같은 캐릭터(같은 캔버스)가 위치·크기만 바꾼다 */}
      <div className="absolute" style={boxStyle}>
        {/* 말풍선 */}
        {!small && (
          <div role="status" key={`${phase}-${picked}-${dragging}`}
            className="animate-pop absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[340px] -translate-x-1/2 rounded-2xl bg-white px-5 py-3 text-[15px] leading-relaxed shadow-lg">
            {dragging && '여기 놓아 주세요! 무슨 서류인지 바로 읽어 볼게요.'}
            {!dragging && phase === 'idle' && '안녕하세요, 모니예요! 저를 클릭해 주세요.'}
            {!dragging && phase === 'menu' && !feature && '무엇을 도와드릴까요? 아래 버튼을 눌러 보세요!'}
            {!dragging && phase === 'menu' && feature && (
              <>
                {feature.say}
                <button onClick={() => changePhase('feature')} className="mt-2 flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
                  {feature.go} <ArrowRight aria-hidden size={16} />
                </button>
              </>
            )}
            <span aria-hidden className="absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white" />
          </div>
        )}

        <button onClick={small ? () => changePhase('menu') : onCharacterClick}
          onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
          aria-label={small ? '모니에게 돌아가기' : phase === 'menu' ? '모니 메뉴 닫기' : '모니 누르기'}
          className="block h-full w-full cursor-pointer rounded-3xl">
          <AiAssistantCharacter state={state} paused={paused} moving={moving} showStatus={false} className="h-full w-full" />
        </button>

        {/* 기능 버튼: 흰 동그라미 + 남색 선·보라 포인트 아이콘 */}
        {phase === 'menu' && (
          <div className="absolute top-full left-1/2 mt-1 grid -translate-x-1/2 grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:gap-3">
            {FEATURES.map(({ key, Icon, label }, i) => (
              <button key={key} onClick={() => pick(key)} aria-pressed={picked === key}
                className="animate-pop flex w-24 flex-col items-center gap-1" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 ${
                  picked === key ? 'ring-3 ring-accent' : ''}`}>
                  <Icon aria-hidden size={24} strokeWidth={2.2} className={picked === key ? 'text-accent' : 'text-[#3d4357]'} />
                </span>
                <span className="rounded-full bg-white/80 px-2 text-[13px] font-medium whitespace-nowrap text-ink">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
