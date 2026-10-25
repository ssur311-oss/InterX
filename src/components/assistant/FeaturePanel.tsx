import { ArrowLeft, Sparkles } from 'lucide-react'
import { BTN, BTN_PRIMARY } from '../ui'
import { FEATURES, type FeatureKey } from './features'
import type { MoniState } from './AiAssistantCharacter'
import { ReceiptPanel } from './ReceiptPanel'

function TextPanel({ placeholder }: { placeholder: string }) {
  return (
    <>
      <textarea placeholder={placeholder} className="min-h-56 w-full resize-none rounded-2xl border border-line bg-white/80 p-4 leading-relaxed focus:border-brand" />
      <div className="mt-4 flex justify-end">
        <button disabled className={BTN_PRIMARY}><Sparkles aria-hidden size={18} /> AI에게 맡기기 (연결 준비 중)</button>
      </div>
    </>
  )
}

const PLACEHOLDER: Record<Exclude<FeatureKey, 'receipt'>, string> = {
  slack: '예) 이서연: 세금계산서는 업체에서 늦게 줘서 30일까지 드릴게요!',
  consult: '예) 출장이 하루 늘어서 숙박비가 1박 더 나왔는데, 어떤 서류를 더 받아야 하나요?',
  notice: '다듬고 싶은 메시지를 붙여넣어 주세요.',
}

type Props = { feature: FeatureKey; onBack: () => void; onMood?: (s: MoniState, ms?: number) => void }

export function FeaturePanel({ feature, onBack, onMood }: Props) {
  const f = FEATURES.find((x) => x.key === feature)!
  return (
    <section className="glass-strong animate-pop flex h-full flex-col rounded-3xl p-6" aria-labelledby="feature-title">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="feature-title" className="flex items-center gap-2 text-2xl font-bold">
          <f.Icon aria-hidden size={24} className="text-[#8b5cf6]" /> {f.label}
        </h2>
        <button onClick={onBack} className={BTN}><ArrowLeft aria-hidden size={18} /> 모니에게 돌아가기</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {feature === 'receipt' ? <ReceiptPanel onMood={onMood} /> : <TextPanel placeholder={PLACEHOLDER[feature]} />}
      </div>
    </section>
  )
}
