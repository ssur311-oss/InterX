import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AiAssistantCharacter, type MoniState } from './AiAssistantCharacter'
import { FeaturePanel } from './FeaturePanel'
import { FEATURES, type FeatureKey } from './features'

type Phase = 'idle' | 'menu' | 'feature'

function usePrefersReducedMotion() {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return reduced
}

/**
 * AI 도우미 무대: 모니를 누르면 기능 버튼이 펼쳐지고, 말풍선이 설명해 준다.
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

  const small = phase === 'feature'
  const feature = FEATURES.find((f) => f.key === picked)
  // 상태 우선순위: 작업 결과(mood) > 마우스를 올려 둠(listening) > 기본
  const state: MoniState = mood !== 'idle' ? mood : hover && !small ? 'listening' : 'idle'

  function onCharacterClick() {
    if (phase === 'menu') {
      setPhase('idle')
      setPicked(null)
      return
    }
    setPhase('menu')
    react('greeting', 2400)
  }

  function pick(key: FeatureKey) {
    setPicked(key)
    react('speaking', 900)
  }

  return (
    <div className="glass relative h-[640px] overflow-hidden rounded-3xl md:h-auto md:min-h-0 md:flex-1">
      {small && picked && (
        <div className="absolute inset-4 right-4 bottom-4 md:right-64">
          <FeaturePanel feature={picked} onBack={() => setPhase('menu')} onMood={react} />
        </div>
      )}

      {/* 모니: 평소엔 가운데 크게, 작업 화면이 열리면 오른쪽 아래로 작게 */}
      <div
        className={`absolute transition-all duration-500 ease-out motion-reduce:transition-none ${small ? '' :
          'top-1/2 left-1/2 h-[44%] w-[94%] -translate-x-1/2 -translate-y-[52%] sm:h-[min(380px,58%)] sm:w-[min(600px,94%)] sm:-translate-y-[38%]'}`}
        style={small ? { right: 16, bottom: 16, width: 232, height: 200 } : undefined}
      >
        {/* 말풍선 */}
        {!small && (
          <div role="status" key={`${phase}-${picked}`}
            className="animate-pop absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[340px] -translate-x-1/2 rounded-2xl bg-white px-5 py-3 text-[15px] leading-relaxed shadow-lg">
            {phase === 'idle' && '안녕하세요, 모니예요! 저를 클릭해 주세요.'}
            {phase === 'menu' && !feature && '무엇을 도와드릴까요? 아래 버튼을 눌러 보세요!'}
            {phase === 'menu' && feature && (
              <>
                {feature.say}
                <button onClick={() => setPhase('feature')} className="mt-2 flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline">
                  {feature.go} <ArrowRight aria-hidden size={16} />
                </button>
              </>
            )}
            <span aria-hidden className="absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white" />
          </div>
        )}

        <button onClick={small ? () => setPhase('menu') : onCharacterClick}
          onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
          aria-label={small ? '모니에게 돌아가기' : phase === 'menu' ? '모니 메뉴 닫기' : '모니 누르기'}
          className="block h-full w-full cursor-pointer rounded-3xl">
          <AiAssistantCharacter state={state} paused={paused} showStatus={false} className="h-full w-full" />
        </button>

        {/* 기능 버튼: 흰 동그라미 + 남색 선·보라 포인트 아이콘 */}
        {phase === 'menu' && (
          <div className="absolute top-full left-1/2 mt-1 grid -translate-x-1/2 grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:gap-3">
            {FEATURES.map(({ key, Icon, label }, i) => (
              <button key={key} onClick={() => pick(key)} aria-pressed={picked === key}
                className="animate-pop flex w-24 flex-col items-center gap-1" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 ${
                  picked === key ? 'ring-3 ring-[#8b5cf6]' : ''}`}>
                  <Icon aria-hidden size={24} strokeWidth={2.2} className={picked === key ? 'text-[#8b5cf6]' : 'text-[#3d4357]'} />
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
