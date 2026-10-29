import { useState } from 'react'
import { AiAssistantCharacter, type MoniState } from '../components/assistant/AiAssistantCharacter'
import { Card, PageHeader, Workspace } from '../components/ui'

// 모니 동작 비교용 데모 화면 (메뉴에 없음, /assistant/demo). 실제 AI·데이터와 연결되지 않는다
type Mode = 'auto' | 'idle' | 'greeting' | 'thinking' | 'reading' | 'ready' | 'success' | 'error' | 'dizzy' | 'petted'
const MODES: { key: Mode; label: string }[] = [
  { key: 'auto', label: '자동 반응' },
  { key: 'idle', label: '혼자 놀기' },
  { key: 'greeting', label: '인사' },
  { key: 'thinking', label: '생각 중' },
  { key: 'reading', label: '줄 따라 읽기' },
  { key: 'ready', label: '받을 준비' },
  { key: 'success', label: '완료' },
  { key: 'error', label: '확인 필요' },
  { key: 'dizzy', label: '어지러움' },
  { key: 'petted', label: '쓰다듬기' },
]

export default function AssistantDemo() {
  const [mode, setMode] = useState<Mode>('auto')
  const [nonce, setNonce] = useState(0)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const state: MoniState = mode === 'auto' || mode === 'idle' ? 'idle' : mode

  // 같은 버튼을 다시 눌러도 그 동작이 처음부터 한 번만 다시 나온다
  function choose(next: Mode) {
    setMode(next)
    setNonce((n) => n + 1)
  }

  return (
    <Workspace fit>
      <PageHeader title="모니 동작 데모" desc="실시간 3D 동작 시연이에요. 실제 AI 연결과는 관계없어요." />
      <Card className="flex min-h-[520px] flex-col md:min-h-0 md:flex-1">
        <AiAssistantCharacter state={state} replay={nonce} paused={paused} forceIdle={mode === 'idle'} className="min-h-0 flex-1" />
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="동작 고르기">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => choose(m.key)} aria-pressed={mode === m.key}
              className={`min-h-11 rounded-full px-4 ${mode === m.key ? 'bg-ink font-semibold text-white' : 'bg-white/80 text-body hover:bg-white'}`}>
              {m.label}
            </button>
          ))}
          <button onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="ml-auto min-h-11 rounded-full bg-white/80 px-4 text-body hover:bg-white">
            {paused ? '움직임 켜기' : '움직임 멈추기'}
          </button>
        </div>
      </Card>
    </Workspace>
  )
}
